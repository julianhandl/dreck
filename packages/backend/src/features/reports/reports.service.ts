import { amountMinor, roundSeconds } from '@dreck/shared/report';
import { asc, eq } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { customers } from '@/features/customers/customers.table';
import { entryFilter } from '@/features/entry-filter';
import { expenses } from '@/features/expenses/expenses.table';
import { projects } from '@/features/projects/projects.table';
import { getSettings, type Settings } from '@/features/settings/settings.service';
import { tasks } from '@/features/tasks/tasks.table';
import { timeEntries } from '@/features/time-entries/time-entries.table';

export type ReportFilter = { from: string; to: string; customerId?: number; projectId?: number };

type Named = { id: number; name: string; archived: boolean };

/** One Time Entry or Expense of the Report, also one CSV row. */
export type ReportLine = {
  type: 'timeEntry' | 'expense';
  date: string;
  customer: Named;
  project: Named;
  /** Name of the Task of a Time Entry. */
  task: string | null;
  description: string | null;
  /** Exact seconds; a running Time Entry counts until now. 0 for an Expense. */
  seconds: number;
  roundedSeconds: number;
  /** `null` for an Expense and for non-billable time. */
  hourlyRateMinor: number | null;
  /** Time: round(rate × rounded seconds / 3600), 0 if not billable. Expense: its amount. */
  amountMinor: number;
  /** Time: its Task is billable (without Task: yes). */
  billable: boolean;
};

type Sums = {
  seconds: number;
  roundedSeconds: number;
  amountMinor: number;
  /** Rounded seconds of non-billable Tasks, part of `roundedSeconds`. */
  nonBillableSeconds: number;
  billableExpensesMinor: number;
  ownExpensesMinor: number;
};

type ProjectReport = Named & Sums;
type CustomerReport = Named & Sums & { projects: ProjectReport[] };

export type Report = ReportFilter &
  Pick<Settings, 'currency' | 'roundingMinutes'> & {
    totals: Sums;
    customers: CustomerReport[];
  };

/** Time Entries and Expenses of the period (Archived included), sorted by date. */
export function loadReportLines(db: Db, filter: ReportFilter, settings: Settings): ReportLine[] {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const customer = { id: customers.id, name: customers.name, archived: customers.archived };
  const project = { id: projects.id, name: projects.name, archived: projects.archived };

  const timeLines = db
    .select({ entry: timeEntries, customer, project, task: tasks })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
    .where(entryFilter(db, timeEntries, filter))
    .orderBy(asc(timeEntries.date), asc(timeEntries.id))
    .all()
    .map(({ entry, task, ...rest }): ReportLine => {
      const running = entry.runningSince === null ? 0 : nowSeconds - entry.runningSince;
      const seconds = entry.durationSeconds + Math.max(0, running);
      const roundedSeconds = roundSeconds(seconds, settings.roundingMinutes);
      const billable = task?.billable ?? true;
      return {
        ...rest,
        type: 'timeEntry',
        date: entry.date,
        task: task?.name ?? null,
        description: entry.description,
        seconds,
        roundedSeconds,
        hourlyRateMinor: billable ? entry.hourlyRateMinor : null,
        amountMinor: billable ? amountMinor(entry.hourlyRateMinor, roundedSeconds) : 0,
        billable,
      };
    });

  const expenseLines = db
    .select({ expense: expenses, customer, project })
    .from(expenses)
    .innerJoin(projects, eq(expenses.projectId, projects.id))
    .innerJoin(customers, eq(projects.customerId, customers.id))
    .where(entryFilter(db, expenses, filter))
    .orderBy(asc(expenses.date), asc(expenses.id))
    .all()
    .map(
      ({ expense, ...rest }): ReportLine => ({
        ...rest,
        type: 'expense',
        date: expense.date,
        task: null,
        description: expense.description,
        seconds: 0,
        roundedSeconds: 0,
        hourlyRateMinor: null,
        amountMinor: expense.amountMinor,
        billable: expense.billable,
      }),
    );

  // Stable sort keeps time before expenses within a day
  return [...timeLines, ...expenseLines].sort((a, b) => a.date.localeCompare(b.date));
}

/** Sums per Customer and below per Project, sorted by name. */
export function buildReport(db: Db, filter: ReportFilter): Report {
  const settings = getSettings(db);
  const totals = zeroSums();
  const byCustomer = new Map<number, CustomerReport & { byProject: Map<number, ProjectReport> }>();

  for (const line of loadReportLines(db, filter, settings)) {
    let customer = byCustomer.get(line.customer.id);
    if (!customer) {
      customer = { ...line.customer, ...zeroSums(), projects: [], byProject: new Map() };
      byCustomer.set(line.customer.id, customer);
    }
    let project = customer.byProject.get(line.project.id);
    if (!project) {
      project = { ...line.project, ...zeroSums() };
      customer.byProject.set(line.project.id, project);
    }
    for (const sums of [totals, customer, project]) add(sums, line);
  }

  return {
    ...filter,
    currency: settings.currency,
    roundingMinutes: settings.roundingMinutes,
    totals,
    customers: [...byCustomer.values()].sort(byName).map(({ byProject, ...customer }) => ({
      ...customer,
      projects: [...byProject.values()].sort(byName),
    })),
  };
}

function zeroSums(): Sums {
  return {
    seconds: 0,
    roundedSeconds: 0,
    amountMinor: 0,
    nonBillableSeconds: 0,
    billableExpensesMinor: 0,
    ownExpensesMinor: 0,
  };
}

function add(sums: Sums, line: ReportLine): void {
  if (line.type === 'timeEntry') {
    sums.seconds += line.seconds;
    sums.roundedSeconds += line.roundedSeconds;
    sums.amountMinor += line.amountMinor;
    if (!line.billable) sums.nonBillableSeconds += line.roundedSeconds;
  } else if (line.billable) {
    sums.billableExpensesMinor += line.amountMinor;
  } else {
    sums.ownExpensesMinor += line.amountMinor;
  }
}

function byName(a: Named, b: Named): number {
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id;
}
