import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { customers } from '@/features/customers/customers.table';

export const projects = sqliteTable(
  'projects',
  {
    id: integer('id').primaryKey(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    hourlyRateMinor: integer('hourly_rate_minor').notNull(),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    budgetSeconds: integer('budget_seconds'),
    budgetAmountMinor: integer('budget_amount_minor'),
    budgetMonthly: integer('budget_monthly', { mode: 'boolean' }).notNull().default(false),
    budgetIncludesExpenses: integer('budget_includes_expenses', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (t) => [
    uniqueIndex('projects_customer_name_unique').on(t.customerId, sql`lower(${t.name})`),
    check('projects_rate_not_negative', sql`${t.hourlyRateMinor} >= 0`),
    check(
      'projects_budget_seconds_positive',
      sql`${t.budgetSeconds} IS NULL OR ${t.budgetSeconds} > 0`,
    ),
    check(
      'projects_budget_amount_positive',
      sql`${t.budgetAmountMinor} IS NULL OR ${t.budgetAmountMinor} > 0`,
    ),
    check(
      'projects_budget_one_kind',
      sql`NOT (${t.budgetSeconds} IS NOT NULL AND ${t.budgetAmountMinor} IS NOT NULL)`,
    ),
    check(
      'projects_budget_expenses_need_amount',
      sql`${t.budgetIncludesExpenses} = 0 OR ${t.budgetAmountMinor} IS NOT NULL`,
    ),
  ],
);

export type Project = typeof projects.$inferSelect;
