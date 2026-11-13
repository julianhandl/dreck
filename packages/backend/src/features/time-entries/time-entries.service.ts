import { asc, desc, eq } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { type EntryFilter, entryFilter } from '@/features/entry-filter';
import { requireProject } from '@/features/projects/projects.service';
import { ApiError } from '@/http/api-error';
import { type TimeEntry, timeEntries } from './time-entries.table';

type TimeEntryInput = {
  projectId: number;
  date: string;
  durationSeconds: number;
  description?: string;
};

type TimeEntryChanges = {
  projectId?: number;
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

/** Creates a stopped Time Entry with the Hourly Rate of its Project. */
export function createTimeEntry(db: Db, input: TimeEntryInput): TimeEntry {
  const project = requireProject(db, input.projectId);
  return db
    .insert(timeEntries)
    .values({
      ...input,
      description: input.description || null,
      hourlyRateMinor: project.hourlyRateMinor,
    })
    .returning()
    .get();
}

/**
 * Changes a Time Entry. A new Project brings its rate and clears the "corrected by hand" mark;
 * a rate sent along wins and marks the entry as corrected. On a running entry the duration sets
 * the displayed total and restarts the running part now.
 */
export function updateTimeEntry(db: Db, id: number, input: TimeEntryChanges): TimeEntry {
  return db.transaction((tx) => {
    const current = tx.select().from(timeEntries).where(eq(timeEntries.id, id)).get();
    if (!current) throw new ApiError('not_found', 'Time entry not found');
    requireNotInvoiced(current);

    const changes: Partial<TimeEntry> = { ...input };
    if (input.description !== undefined) changes.description = input.description || null;
    if (input.projectId !== undefined) {
      changes.hourlyRateMinor = requireProject(tx, input.projectId).hourlyRateMinor;
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
