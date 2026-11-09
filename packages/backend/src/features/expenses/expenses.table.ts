import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from '@/features/projects/projects.table';

export const expenses = sqliteTable(
  'expenses',
  {
    id: integer('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    date: text('date').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    description: text('description').notNull(),
    billable: integer('billable', { mode: 'boolean' }).notNull(),
  },
  (t) => [
    index('expenses_date').on(t.date),
    index('expenses_project_id').on(t.projectId),
    check('expenses_amount_positive', sql`${t.amountMinor} > 0`),
    check('expenses_description_not_blank', sql`length(trim(${t.description})) > 0`),
  ],
);

export type Expense = typeof expenses.$inferSelect;
