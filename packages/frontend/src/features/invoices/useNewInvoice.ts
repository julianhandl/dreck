import type { Expense } from '@dreck/shared/api/expenses';
import type { Invoice } from '@dreck/shared/api/invoices';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { itemAmountMinor } from '@dreck/shared/invoice';
import { draftItems, type InvoiceGrouping } from '@dreck/shared/invoice-items';
import { roundSeconds } from '@dreck/shared/report';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import type { Catalog } from '@/catalog/useCatalog';
import { useToday } from '@/clock/useNow';
import { addDays } from '@/format/calendar';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';

export type InvoiceSource = 'import' | 'empty';

/** Initial choice of the form; `projectId` is `all` or an id. */
export type InvoiceStart = { customerId: string; projectId: string };

/** An item as the import would create it. */
export type PreviewItem = {
  key: string;
  description: string;
  quantityHundredths: number;
  unitPriceMinor: number;
  amountMinor: number;
};

/** What an import would take over, after Rounding, in the order of the Invoice. */
export type ImportPreview = {
  items: PreviewItem[];
  entries: number;
  seconds: number;
  timeMinor: number;
  expenses: number;
  expensesMinor: number;
  subtotalMinor: number;
};

export type NewInvoice = {
  customerId: string;
  /** Customers that can get a new Invoice: not Archived, plus the one of the start. */
  customers: Catalog['customers'];
  projectId: string;
  /** Projects of the Customer: not Archived, plus the chosen one. */
  projects: Catalog['projects'];
  source: InvoiceSource;
  from: string;
  to: string;
  grouping: InvoiceGrouping;
  withExpenses: boolean;
  preview: QueryState<ImportPreview>;
  submit: Submit<null>;
  handleCustomerChange: (value: string) => void;
  handleProjectChange: (value: string) => void;
  handleSourceChange: (value: InvoiceSource) => void;
  handleFromChange: (value: string) => void;
  handleToChange: (value: string) => void;
  handleGroupingChange: (value: InvoiceGrouping) => void;
  handleWithExpensesChange: (value: boolean) => void;
};

/** Days between issue and due date of a new Invoice; changeable in the form afterwards. */
const PAYMENT_DAYS = 14;

/**
 * Customer and Project to start with: those of `projectId` ("Verrechnen"), otherwise the first
 * Customer that is not Archived and all its Projects.
 */
export function invoiceStart(catalog: Catalog, projectId: number | null): InvoiceStart {
  const project = projectId === null ? undefined : catalog.project(projectId);
  if (project) return { customerId: String(project.customerId), projectId: String(project.id) };
  const customer = catalog.customers.find((c) => !c.archived);
  return { customerId: String(customer?.id ?? ''), projectId: 'all' };
}

/**
 * State of "Neue Rechnung": Customer, Project, source and range with a live preview of the
 * items the uninvoiced Time Entries and Expenses become; creates the draft and opens it.
 */
export function useNewInvoice(catalog: Catalog, start: InvoiceStart): NewInvoice {
  const { language, messages } = useI18n();
  const { roundingMinutes } = useSettings();
  const today = useToday();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState(start.customerId);
  const [projectId, setProjectId] = useState(start.projectId);
  const [source, setSource] = useState<InvoiceSource>('import');
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);
  const [grouping, setGrouping] = useState<InvoiceGrouping>(
    start.projectId === 'all' ? 'project' : 'description',
  );
  const [withExpenses, setWithExpenses] = useState(true);

  const customers = catalog.customers.filter(
    (c) => !c.archived || String(c.id) === start.customerId,
  );
  const projects = catalog.projects.filter(
    (p) => String(p.customerId) === customerId && (!p.archived || String(p.id) === projectId),
  );
  const project = projectId === 'all' ? undefined : Number(projectId);
  const filter = { customerId: customerId || undefined, projectId: project, from, to };
  const state = combineQueries(
    useQuery<TimeEntry[]>('/time-entries', filter),
    useQuery<Expense[]>('/expenses', filter),
  );
  let preview: QueryState<ImportPreview>;
  if (state.status !== 'ready') preview = state;
  else {
    const projectName = (id: number): string => catalog.project(id)?.name ?? '';
    // Like the import: time of non-billable Tasks stays out
    const time = state.data[0]
      .filter(
        (e) =>
          e.invoiceItemId === null &&
          e.runningSince === null &&
          (catalog.task(e.taskId)?.billable ?? true),
      )
      .map((e) => ({
        ...e,
        project: projectName(e.projectId),
        task: catalog.task(e.taskId)?.name ?? null,
        seconds: roundSeconds(e.durationSeconds, roundingMinutes),
      }));
    const expenses = withExpenses
      ? state.data[1]
          .filter((e) => e.billable && e.invoiceItemId === null)
          .map((e) => ({ ...e, project: projectName(e.projectId) }))
      : [];
    const drafts = draftItems(time, expenses, grouping, language).map((d) => ({
      ...d,
      amountMinor: itemAmountMinor(d.quantityHundredths, d.unitPriceMinor),
    }));
    const sum = (list: typeof drafts): number => list.reduce((s, d) => s + d.amountMinor, 0);
    const timeDrafts = drafts.filter((d) => d.timeEntryIds.length > 0);
    preview = {
      status: 'ready',
      data: {
        items: drafts.map(({ timeEntryIds, expenseIds, ...item }) => ({
          ...item,
          key: `${timeEntryIds.join(',')}|${expenseIds.join(',')}`,
        })),
        entries: timeDrafts.reduce((s, d) => s + d.timeEntryIds.length, 0),
        seconds: time.filter((t) => t.seconds > 0).reduce((s, t) => s + t.seconds, 0),
        timeMinor: sum(timeDrafts),
        expenses: expenses.length,
        expensesMinor: sum(drafts.filter((d) => d.expenseIds.length > 0)),
        subtotalMinor: sum(drafts),
      },
    };
  }

  const submit = useSubmit(
    async () => {
      const created = await api.post<Invoice>('/invoices', {
        customerId: Number(customerId),
        issueDate: today,
        dueDate: addDays(today, PAYMENT_DAYS),
        import:
          source === 'import'
            ? { from, to, projectId: project, grouping, expenses: withExpenses }
            : undefined,
      });
      navigate(`/invoices/${created.id}/edit`);
    },
    {
      validate: (): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (customerId === '') errors.customerId = messages.invoices.form.errors.required;
        if (source === 'import' && to < from) {
          errors.to = messages.invoices.form.errors.periodOrder;
        }
        return errors;
      },
    },
  );

  return {
    customerId,
    customers,
    projectId,
    projects,
    source,
    from,
    to,
    grouping,
    withExpenses,
    preview,
    submit,
    handleCustomerChange: (value) => {
      setCustomerId(value);
      setProjectId('all');
    },
    handleProjectChange: (value) => {
      setProjectId(value);
      // Per Project makes no sense for a single Project
      if (value !== 'all' && grouping === 'project') setGrouping('description');
    },
    handleSourceChange: setSource,
    handleFromChange: (value) => value && setFrom(value),
    handleToChange: (value) => value && setTo(value),
    handleGroupingChange: setGrouping,
    handleWithExpensesChange: setWithExpenses,
  };
}
