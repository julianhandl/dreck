import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const customers = sqliteTable(
  'customers',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    hourlyRateMinor: integer('hourly_rate_minor').notNull(),
    /** Postal address for invoices, several lines. */
    address: text('address'),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    // lower() equals NOCASE: both fold ASCII only
    uniqueIndex('customers_name_unique').on(sql`lower(${t.name})`),
    check('customers_rate_not_negative', sql`${t.hourlyRateMinor} >= 0`),
  ],
);

export type Customer = typeof customers.$inferSelect;
