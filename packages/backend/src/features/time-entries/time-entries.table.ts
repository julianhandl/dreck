import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { projects } from '@/features/projects/projects.table';

export const timeEntries = sqliteTable(
  'time_entries',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    date: text('date').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    /** Unix seconds UTC, set only while the Time Entry runs (the Timer). */
    runningSince: integer('running_since'),
    description: text('description'),
    hourlyRateMinor: integer('hourly_rate_minor').notNull(),
    hourlyRateOverridden: integer('hourly_rate_overridden', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (t) => [
    index('time_entries_date').on(t.date),
    index('time_entries_project_id').on(t.projectId),
    // At most one running Time Entry
    uniqueIndex('time_entries_single_running').on(sql`(1)`).where(sql`running_since IS NOT NULL`),
    check('time_entries_duration_not_negative', sql`${t.durationSeconds} >= 0`),
    check('time_entries_rate_not_negative', sql`${t.hourlyRateMinor} >= 0`),
  ],
);

export type TimeEntry = typeof timeEntries.$inferSelect;
