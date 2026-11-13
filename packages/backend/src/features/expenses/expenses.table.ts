import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { invoiceItems } from '@/features/invoices/invoices.table';
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
    /** Set while invoiced; the expense is locked then. */
    invoiceItemId: integer('invoice_item_id').references(() => invoiceItems.id, {
      onDelete: 'restrict',
    }),
  },
  (t) => [
    index('expenses_date').on(t.date),
    index('expenses_project_id').on(t.projectId),
    index('expenses_invoice_item_id').on(t.invoiceItemId),
    check('expenses_amount_positive', sql`${t.amountMinor} > 0`),
    check('expenses_description_not_blank', sql`length(trim(${t.description})) > 0`),
  ],
);

export type Expense = typeof expenses.$inferSelect;
