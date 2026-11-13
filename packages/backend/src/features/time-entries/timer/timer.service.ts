import { dateInTimeZone } from '@dreck/shared/time';
import { eq, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { requireProject } from '@/features/projects/projects.service';
import { getSettings } from '@/features/settings/settings.service';
import { requireNotInvoiced } from '@/features/time-entries/time-entries.service';
import { type TimeEntry, timeEntries } from '@/features/time-entries/time-entries.table';
import { ApiError, fieldError } from '@/http/api-error';

export type StartTimerInput =
  | { projectId: number; description?: string; at?: string }
  | { timeEntryId: number; at?: string };

type StartTimerResult = { started: TimeEntry; stopped: TimeEntry | null };

/** The running Time Entry, if any. */
export function getRunningTimeEntry(db: Db): TimeEntry | undefined {
  return db.select().from(timeEntries).where(isNotNull(timeEntries.runningSince)).get();
}

/**
 * Starts a new Timer on a Project or continues a Time Entry of today. Stops the running Timer in
 * the same transaction. `at` is the moment of the click; the server takes min(at, now).
 */
export function startTimer(db: Db, input: StartTimerInput): StartTimerResult {
  return db.transaction((tx) => {
    const atMs = clickTime(input.at);
    const today = dateInTimeZone(atMs, getSettings(tx).timezone);
    const running = getRunningTimeEntry(tx);

    if ('timeEntryId' in input) {
      const entry = tx
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.id, input.timeEntryId))
        .get();
      if (!entry) throw fieldError('timeEntryId', 'Time entry not found');
      requireNotInvoiced(entry);
      if (entry.date !== today) {
        throw fieldError('timeEntryId', 'Only time entries of today can be continued');
      }
      if (entry.id === running?.id) return { started: entry, stopped: null };
      const stopped = running ? stop(tx, running, atMs) : null;
      const started = tx
        .update(timeEntries)
        .set({ runningSince: toSeconds(atMs) })
        .where(eq(timeEntries.id, entry.id))
        .returning()
        .get();
      return { started: started ?? entry, stopped };
    }

    const project = requireProject(tx, input.projectId);
    const stopped = running ? stop(tx, running, atMs) : null;
    const started = tx
      .insert(timeEntries)
      .values({
        projectId: project.id,
        date: today,
        durationSeconds: 0,
        runningSince: toSeconds(atMs),
        description: input.description || null,
        hourlyRateMinor: project.hourlyRateMinor,
      })
      .returning()
      .get();
    return { started, stopped };
  });
}

/** Stops the running Timer at min(at, now); `409 no_running_timer` if none runs. */
export function stopTimer(db: Db, at: string | undefined): TimeEntry {
  return db.transaction((tx) => {
    const running = getRunningTimeEntry(tx);
    if (!running) throw new ApiError('no_running_timer', 'No timer is running');
    return stop(tx, running, clickTime(at));
  });
}

function stop(db: Db, running: TimeEntry, atMs: number): TimeEntry {
  const since = running.runningSince ?? 0;
  const at = toSeconds(atMs);
  if (at < since) throw fieldError('at', 'at is before the start of the running timer');
  const stopped = db
    .update(timeEntries)
    .set({
      durationSeconds: sql`${timeEntries.durationSeconds} + ${at - since}`,
      runningSince: null,
    })
    .where(eq(timeEntries.id, running.id))
    .returning()
    .get();
  if (!stopped) throw new Error('Running time entry vanished during stop');
  return stopped;
}

function clickTime(at: string | undefined): number {
  const now = Date.now();
  return at === undefined ? now : Math.min(Date.parse(at), now);
}

function toSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}
