export const INVOICE_GROUPINGS = ['project', 'task', 'description', 'timeEntry'] as const;

export type InvoiceGrouping = (typeof INVOICE_GROUPINGS)[number];

/** A stopped, uninvoiced Time Entry with its duration after Rounding. */
export type BillableTime = {
  id: number;
  projectId: number;
  /** Name of the Project. */
  project: string;
  taskId: number | null;
  /** Name of the Task. */
  task: string | null;
  date: string;
  description: string | null;
  hourlyRateMinor: number;
  seconds: number;
};

/** An uninvoiced Billable Expense. */
export type BillableExpense = {
  id: number;
  project: string;
  date: string;
  description: string;
  amountMinor: number;
};

/** An item before it is saved, with the Time Entries and Expenses it locks. */
export type ItemDraft = {
  description: string;
  quantityHundredths: number;
  unitPriceMinor: number;
  timeEntryIds: number[];
  expenseIds: number[];
};

/**
 * Items of an import, in the order they appear on the Invoice: Time Entries sorted by Project,
 * Task (when grouped by it), date and id, grouped per Project and Hourly Rate, additionally per Task, additionally per
 * description, or one per Time Entry; then one item per Billable Expense. Entries of 0 seconds
 * are left out. The caller passes only billable time.
 * @example draftItems(time, expenses, 'project', 'de') // [{ description: 'Web (2.–30. März 2026)', … }]
 */
export function draftItems(
  time: BillableTime[],
  expenses: BillableExpense[],
  grouping: InvoiceGrouping,
  language: string,
): ItemDraft[] {
  const day = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' });
  const toDate = (d: string): Date => new Date(`${d}T00:00:00Z`);
  const date = (d: string): string => day.format(toDate(d));
  const range = (dates: string[]): string => {
    const sorted = dates.toSorted();
    return day.formatRange(toDate(sorted[0] ?? ''), toDate(sorted.at(-1) ?? ''));
  };
  const label = (project: string, text: string | null, when: string): string =>
    `${project}${text ? `: ${text}` : ''} (${when})`;
  const withTask = (t: BillableTime): string => (t.task ? `${t.project} – ${t.task}` : t.project);
  const byTask = grouping !== 'project';

  const entries = time
    .filter((t) => t.seconds > 0)
    .toSorted(
      (a, b) =>
        a.project.localeCompare(b.project, language, { sensitivity: 'base' }) ||
        a.projectId - b.projectId ||
        (grouping === 'task' || grouping === 'description'
          ? (a.task ?? '').localeCompare(b.task ?? '', language, { sensitivity: 'base' })
          : 0) ||
        a.date.localeCompare(b.date) ||
        a.id - b.id,
    );

  const drafts: ItemDraft[] = [];
  if (grouping === 'timeEntry') {
    for (const t of entries) {
      drafts.push({
        description: label(withTask(t), t.description, date(t.date)),
        quantityHundredths: toHundredths(t.seconds),
        unitPriceMinor: t.hourlyRateMinor,
        timeEntryIds: [t.id],
        expenseIds: [],
      });
    }
  } else {
    const groups = new Map<string, BillableTime[]>();
    for (const t of entries) {
      const text = grouping === 'description' ? (t.description?.trim() ?? '') : '';
      const key = JSON.stringify([t.projectId, byTask ? t.taskId : null, t.hourlyRateMinor, text]);
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    for (const rows of groups.values()) {
      const [first] = rows;
      if (!first) continue;
      const text = grouping === 'description' ? (first.description?.trim() ?? '') : null;
      drafts.push({
        description: label(
          byTask ? withTask(first) : first.project,
          text,
          range(rows.map((r) => r.date)),
        ),
        quantityHundredths: toHundredths(rows.reduce((sum, r) => sum + r.seconds, 0)),
        unitPriceMinor: first.hourlyRateMinor,
        timeEntryIds: rows.map((r) => r.id),
        expenseIds: [],
      });
    }
  }

  const sortedExpenses = expenses.toSorted((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  for (const e of sortedExpenses) {
    drafts.push({
      description: label(e.project, e.description, date(e.date)),
      quantityHundredths: 100,
      unitPriceMinor: e.amountMinor,
      timeEntryIds: [],
      expenseIds: [e.id],
    });
  }
  return drafts;
}

/** Seconds as hours × 100, rounded half up (1:15 h → 125). */
export function toHundredths(seconds: number): number {
  return Math.floor((seconds + 18) / 36);
}
