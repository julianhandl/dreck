import type { Task, TaskInput } from '@dreck/shared/api/tasks';
import { taskRateMinor } from '@dreck/shared/api/tasks';

/** One row of the Task list editor; `rate` is text, empty = the Hourly Rate of the Project. */
export type TaskRow = {
  /** Stable React key, also part of the field names. */
  key: string;
  /** Missing for a new Task. */
  id?: number;
  name: string;
  billable: boolean;
  rate: string;
  archived: boolean;
};

/** Field names of a row for `<Form errors>`. */
export const taskFieldName = (key: string, field: 'name' | 'rate'): string =>
  `tasks.${key}.${field}`;

/** Rows for existing Tasks or Default Tasks. */
export function taskRows(
  tasks: (Pick<Task, 'name' | 'billable'> & Partial<Task>)[],
  rateText: (minor: number) => string,
): TaskRow[] {
  return tasks.map((task, index) => ({
    key: task.id === undefined ? `default-${index}` : `task-${task.id}`,
    id: task.id,
    name: task.name,
    billable: task.billable,
    rate: task.hourlyRateMinor == null ? '' : rateText(task.hourlyRateMinor),
    archived: task.archived ?? false,
  }));
}

/** An empty, billable row. */
export function newTaskRow(key: string): TaskRow {
  return { key, name: '', billable: true, rate: '', archived: false };
}

/** Changes one row; a non-billable Task loses its own rate. */
export function changeTaskRow(
  rows: TaskRow[],
  key: string,
  patch: Partial<Pick<TaskRow, 'name' | 'billable' | 'rate' | 'archived'>>,
): TaskRow[] {
  return rows.map((row) => {
    if (row.key !== key) return row;
    const next = { ...row, ...patch };
    return next.billable ? next : { ...next, rate: '' };
  });
}

/** Rows that are saved: new rows without a name are dropped. */
function savedRows(rows: TaskRow[]): TaskRow[] {
  return rows.filter((row) => row.id !== undefined || row.name.trim() !== '');
}

type RowMessages = { nameRequired: string; nameTaken: string; rate: string };

/** Client-side errors per field name: missing or repeated names, unreadable rates. */
export function taskRowErrors(
  rows: TaskRow[],
  parseRate: (text: string) => number | null,
  t: RowMessages,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of savedRows(rows)) {
    const name = row.name.trim().toLowerCase();
    if (name === '') errors[taskFieldName(row.key, 'name')] = t.nameRequired;
    else if (seen.has(name)) errors[taskFieldName(row.key, 'name')] = t.nameTaken;
    seen.add(name);
    if (row.rate.trim() !== '' && parseRate(row.rate) === null) {
      errors[taskFieldName(row.key, 'rate')] = t.rate;
    }
  }
  return errors;
}

/** The rows as API input; an empty rate means the Project rate. */
export function taskInputs(
  rows: TaskRow[],
  parseRate: (text: string) => number | null,
): TaskInput[] {
  return savedRows(rows).map((row) => ({
    ...(row.id !== undefined && { id: row.id }),
    name: row.name.trim(),
    billable: row.billable,
    hourlyRateMinor: row.billable && row.rate.trim() !== '' ? parseRate(row.rate) : null,
    archived: row.archived,
  }));
}

/** Project and Tasks as far as they decide the rate of a Time Entry. */
export type RateSource = {
  hourlyRateMinor: number;
  tasks: { id?: number; hourlyRateMinor?: number | null }[];
};

/**
 * Rate a Time Entry takes over when its Project or Task changes from `before` to `after`, or
 * `null` if its rate source stays the same. A removed Task is archived and keeps its rate.
 * @example newEntryRate({ taskId: null }, { hourlyRateMinor: 9000, tasks: [] }, { hourlyRateMinor: 10000, tasks: [] }) // 10000
 */
export function newEntryRate(
  entry: { taskId: number | null },
  before: RateSource,
  after: RateSource,
): number | null {
  const find = (source: RateSource): { hourlyRateMinor: number | null } | undefined => {
    const task = source.tasks.find((t) => entry.taskId !== null && t.id === entry.taskId);
    return task && { hourlyRateMinor: task.hourlyRateMinor ?? null };
  };
  const oldTask = find(before);
  const oldRate = taskRateMinor(oldTask, before);
  const newRate = taskRateMinor(find(after) ?? oldTask, after);
  return newRate === oldRate ? null : newRate;
}

/** The Task's own rate wins: a Time Entry of such a Task ignores Customer rate changes. */
export function followsProjectRate(
  entry: { taskId: number | null },
  tasks: Pick<Task, 'id' | 'hourlyRateMinor'>[],
): boolean {
  return tasks.find((t) => t.id === entry.taskId)?.hourlyRateMinor == null;
}
