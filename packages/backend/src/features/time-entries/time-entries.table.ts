import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { invoiceItems } from '@/features/invoices/invoices.table';
import { projects } from '@/features/projects/projects.table';
import { tasks } from '@/features/tasks/tasks.table';

export const timeEntries = sqliteTable(
  'time_entries',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    /** Optional; belongs to the same Project (checked by the service). */
    taskId: integer('task_id').references(() => tasks.id, { onDelete: 'restrict' }),
    date: text('date').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    /** Unix seconds UTC, set only while the Time Entry runs (the Timer). */
    runningSince: integer('running_since'),
    description: text('description'),
    hourlyRateMinor: integer('hourly_rate_minor').notNull(),
    hourlyRateOverridden: integer('hourly_rate_overridden', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** Set while invoiced; the entry is locked then. */
    invoiceItemId: integer('invoice_item_id').references(() => invoiceItems.id, {
      onDelete: 'restrict',
    }),
  },
  (t) => [
    index('time_entries_date').on(t.date),
    index('time_entries_project_id').on(t.projectId),
    index('time_entries_task_id').on(t.taskId),
    index('time_entries_invoice_item_id').on(t.invoiceItemId),
    // At most one running Time Entry
    uniqueIndex('time_entries_single_running').on(sql`(1)`).where(sql`running_since IS NOT NULL`),
    check('time_entries_duration_not_negative', sql`${t.durationSeconds} >= 0`),
    check('time_entries_rate_not_negative', sql`${t.hourlyRateMinor} >= 0`),
  ],
);

export type TimeEntry = typeof timeEntries.$inferSelect;
