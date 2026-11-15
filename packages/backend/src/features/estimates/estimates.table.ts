import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { customers } from '@/features/customers/customers.table';

export const estimates = sqliteTable(
  'estimates',
  {
    id: integer('id').primaryKey(),
    number: text('number').notNull(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    /** Name and address as printed; copied from the Customer, editable per Estimate. */
    recipient: text('recipient').notNull(),
    issueDate: text('issue_date').notNull(),
    validUntil: text('valid_until'),
    subject: text('subject'),
    notes: text('notes'),
    taxBasisPoints: integer('tax_basis_points').notNull(),
    discountBasisPoints: integer('discount_basis_points').notNull(),
    sentOn: text('sent_on'),
    acceptedOn: text('accepted_on'),
    declinedOn: text('declined_on'),
  },
  (t) => [
    // lower() equals NOCASE: both fold ASCII only
    uniqueIndex('estimates_number_unique').on(sql`lower(${t.number})`),
    index('estimates_customer_id').on(t.customerId),
    check('estimates_tax_range', sql`${t.taxBasisPoints} BETWEEN 0 AND 10000`),
    check('estimates_discount_range', sql`${t.discountBasisPoints} BETWEEN 0 AND 10000`),
    check(
      'estimates_valid_after_issue',
      sql`${t.validUntil} IS NULL OR ${t.validUntil} >= ${t.issueDate}`,
    ),
    check(
      'estimates_not_accepted_and_declined',
      sql`NOT (${t.acceptedOn} IS NOT NULL AND ${t.declinedOn} IS NOT NULL)`,
    ),
  ],
);

export type Estimate = typeof estimates.$inferSelect;

export const estimateItems = sqliteTable(
  'estimate_items',
  {
    id: integer('id').primaryKey(),
    estimateId: integer('estimate_id')
      .notNull()
      .references(() => estimates.id, { onDelete: 'restrict' }),
    description: text('description').notNull(),
    quantityHundredths: integer('quantity_hundredths').notNull(),
    unitPriceMinor: integer('unit_price_minor').notNull(),
  },
  (t) => [
    index('estimate_items_estimate_id').on(t.estimateId),
    check('estimate_items_quantity_not_negative', sql`${t.quantityHundredths} >= 0`),
    check('estimate_items_price_not_negative', sql`${t.unitPriceMinor} >= 0`),
  ],
);

export type EstimateItem = typeof estimateItems.$inferSelect;
