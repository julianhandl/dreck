import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { projects } from '@/features/projects/projects.table';

export const tasks = sqliteTable(
  'tasks',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    billable: integer('billable', { mode: 'boolean' }).notNull(),
    /** Own Hourly Rate; NULL = the rate of the Project. */
    hourlyRateMinor: integer('hourly_rate_minor'),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    index('tasks_project_id').on(t.projectId),
    uniqueIndex('tasks_project_name_unique').on(t.projectId, sql`lower(${t.name})`),
    check('tasks_rate_not_negative', sql`${t.hourlyRateMinor} >= 0`),
    check('tasks_rate_only_billable', sql`${t.billable} = 1 OR ${t.hourlyRateMinor} IS NULL`),
  ],
);

export type Task = typeof tasks.$inferSelect;

/** Tasks a new Project copies; changes affect only new Projects. */
export const defaultTasks = sqliteTable(
  'default_tasks',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    billable: integer('billable', { mode: 'boolean' }).notNull(),
  },
  (t) => [uniqueIndex('default_tasks_name_unique').on(sql`lower(${t.name})`)],
);

export type DefaultTask = typeof defaultTasks.$inferSelect;
