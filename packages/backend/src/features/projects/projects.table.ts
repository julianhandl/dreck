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
  },
  (t) => [
    uniqueIndex('projects_customer_name_unique').on(t.customerId, sql`lower(${t.name})`),
    check('projects_rate_not_negative', sql`${t.hourlyRateMinor} >= 0`),
  ],
);

export type Project = typeof projects.$inferSelect;
