import { taskRateMinor } from '@dreck/shared/api/tasks';
import { asc, desc, eq } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { type EntryFilter, entryFilter } from '@/features/entry-filter';
import { requireProject } from '@/features/projects/projects.service';
import { requireTask } from '@/features/tasks/tasks.service';
import { ApiError } from '@/http/api-error';
import { type TimeEntry, timeEntries } from './time-entries.table';

type TimeEntryInput = {
  projectId: number;
  taskId?: number;
  date: string;
  durationSeconds: number;
  description?: string;
};

type TimeEntryChanges = {
  projectId?: number;
  taskId?: number | null;
  date?: string;
  durationSeconds?: number;
  description?: string | null;
  hourlyRateMinor?: number;
};

/** Time Entries by `date` descending, within a day in the order they were created. */
export function listTimeEntries(db: Db, filter: EntryFilter): TimeEntry[] {
  return db
    .select()
    .from(timeEntries)
    .where(entryFilter(db, timeEntries, filter))
    .orderBy(desc(timeEntries.date), asc(timeEntries.id))
    .all();
}

/**
 * Project, Task and Hourly Rate of a new or moved Time Entry: the Task must belong to the Project,
 * its own rate wins over the Project's.
 */
export function entryRate(
  db: Db,
  projectId: number,
  taskId: number | null | undefined,
): { projectId: number; taskId: number | null; hourlyRateMinor: number } {
  const project = requireProject(db, projectId);
  const task = taskId == null ? undefined : requireTask(db, projectId, taskId);
  return { projectId, taskId: task?.id ?? null, hourlyRateMinor: taskRateMinor(task, project) };
}

/** Creates a stopped Time Entry with the Hourly Rate of its Task or Project. */
export function createTimeEntry(db: Db, input: TimeEntryInput): TimeEntry {
  return db
    .insert(timeEntries)
    .values({
      ...input,
      ...entryRate(db, input.projectId, input.taskId),
      description: input.description || null,
    })
    .returning()
    .get();
}

/**
 * Changes a Time Entry. A new Project or Task brings its rate and clears the "corrected by hand"
 * mark; a new Project without `taskId` drops the Task. A rate sent along wins and marks the
 * entry as corrected. On a running entry the duration sets the displayed total and restarts the
 * running part now.
 */
export function updateTimeEntry(db: Db, id: number, input: TimeEntryChanges): TimeEntry {
  return db.transaction((tx) => {
    const current = tx.select().from(timeEntries).where(eq(timeEntries.id, id)).get();
    if (!current) throw new ApiError('not_found', 'Time entry not found');
    requireNotInvoiced(current);

    const changes: Partial<TimeEntry> = { ...input };
    if (input.description !== undefined) changes.description = input.description || null;
    const moved = input.projectId !== undefined && input.projectId !== current.projectId;
    if (moved || input.taskId !== undefined) {
      const taskId = input.taskId === undefined ? null : input.taskId;
      Object.assign(changes, entryRate(tx, input.projectId ?? current.projectId, taskId));
      changes.hourlyRateOverridden = false;
    }
    if (input.hourlyRateMinor !== undefined) {
      changes.hourlyRateMinor = input.hourlyRateMinor;
      changes.hourlyRateOverridden = true;
    }
    if (input.durationSeconds !== undefined && current.runningSince !== null) {
      changes.runningSince = Math.floor(Date.now() / 1000);
    }

    const updated = tx
      .update(timeEntries)
      .set(changes)
      .where(eq(timeEntries.id, id))
      .returning()
      .get();
    if (!updated) throw new ApiError('not_found', 'Time entry not found');
    return updated;
  });
}

/** Deletes a Time Entry; `409 invoiced` while it is part of an Invoice. */
export function deleteTimeEntry(db: Db, id: number): void {
  db.transaction((tx) => {
    const entry = tx.select().from(timeEntries).where(eq(timeEntries.id, id)).get();
    if (!entry) throw new ApiError('not_found', 'Time entry not found');
    requireNotInvoiced(entry);
    tx.delete(timeEntries).where(eq(timeEntries.id, id)).run();
  });
}

/** Invoiced Time Entries and Expenses are locked until their invoice item is removed. */
export function requireNotInvoiced(entry: { invoiceItemId: number | null }): void {
  if (entry.invoiceItemId !== null) {
    throw new ApiError('invoiced', 'The entry is part of an invoice and cannot change');
  }
}
