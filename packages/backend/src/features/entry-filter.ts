import { and, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Db } from '@/db/db';
import { projects } from '@/features/projects/projects.table';

/** Filter for Time Entries and Expenses; `from`/`to` are calendar dates, both inclusive. */
export type EntryFilter = { from?: string; to?: string; projectId?: number; customerId?: number };

/** WHERE clause for a table with `date` and `projectId`, filters combined with AND. */
export function entryFilter(
  db: Db,
  table: { date: SQLiteColumn; projectId: SQLiteColumn },
  { from, to, projectId, customerId }: EntryFilter,
): SQL | undefined {
  return and(
    from ? gte(table.date, from) : undefined,
    to ? lte(table.date, to) : undefined,
    projectId ? eq(table.projectId, projectId) : undefined,
    customerId
      ? inArray(
          table.projectId,
          db.select({ id: projects.id }).from(projects).where(eq(projects.customerId, customerId)),
        )
      : undefined,
  );
}
