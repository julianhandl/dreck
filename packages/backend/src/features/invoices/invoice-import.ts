import type { InvoiceImport } from '@dreck/shared/api/invoices';
import { draftItems } from '@dreck/shared/invoice-items';
import { roundSeconds } from '@dreck/shared/report';
import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { expenses } from '@/features/expenses/expenses.table';
import { projects } from '@/features/projects/projects.table';
import type { Settings } from '@/features/settings/settings.service';
import { timeEntries } from '@/features/time-entries/time-entries.table';
import { fieldError } from '@/http/api-error';
import { type Invoice, invoiceItems } from './invoices.table';

/**
 * Turns the uninvoiced, stopped Time Entries of the Customer (or of one of its Projects) in the
 * range into items as `draftItems` groups them, optionally plus the Billable Expenses, and locks
 * them. Durations count after Rounding; entries that round to zero stay uninvoiced.
 */
export function importItems(
  db: Db,
  invoice: Invoice,
  { from, to, projectId, grouping, expenses: withExpenses }: InvoiceImport,
  { language, roundingMinutes }: Pick<Settings, 'language' | 'roundingMinutes'>,
): void {
  if (projectId !== undefined) {
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (project?.customerId !== invoice.customerId) {
      throw fieldError('projectId', 'Project not found for this Customer');
    }
  }
  const scope = and(
    eq(projects.customerId, invoice.customerId),
    projectId === undefined ? undefined : eq(projects.id, projectId),
  );

  const time = db
    .select({ entry: timeEntries, project: projects.name })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .where(
      and(
        scope,
        gte(timeEntries.date, from),
        lte(timeEntries.date, to),
        isNull(timeEntries.runningSince),
        isNull(timeEntries.invoiceItemId),
      ),
    )
    .all()
    .map(({ entry, project }) => ({
      ...entry,
      project,
      seconds: roundSeconds(entry.durationSeconds, roundingMinutes),
    }));

  const billable = withExpenses
    ? db
        .select({ expense: expenses, project: projects.name })
        .from(expenses)
        .innerJoin(projects, eq(projects.id, expenses.projectId))
        .where(
          and(
            scope,
            gte(expenses.date, from),
            lte(expenses.date, to),
            eq(expenses.billable, true),
            isNull(expenses.invoiceItemId),
          ),
        )
        .all()
        .map(({ expense, project }) => ({ ...expense, project }))
    : [];

  for (const { timeEntryIds, expenseIds, ...item } of draftItems(
    time,
    billable,
    grouping,
    language,
  )) {
    const { id } = db
      .insert(invoiceItems)
      .values({ ...item, invoiceId: invoice.id })
      .returning({ id: invoiceItems.id })
      .get();
    if (timeEntryIds.length > 0) {
      db.update(timeEntries)
        .set({ invoiceItemId: id })
        .where(inArray(timeEntries.id, timeEntryIds))
        .run();
    }
    if (expenseIds.length > 0) {
      db.update(expenses).set({ invoiceItemId: id }).where(inArray(expenses.id, expenseIds)).run();
    }
  }
}
