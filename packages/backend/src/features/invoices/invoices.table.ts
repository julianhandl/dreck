import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { customers } from '@/features/customers/customers.table';

export const invoices = sqliteTable(
  'invoices',
  {
    id: integer('id').primaryKey(),
    number: text('number').notNull(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    /** Name and address as printed; copied from the Customer, editable per Invoice. */
    recipient: text('recipient').notNull(),
    issueDate: text('issue_date').notNull(),
    dueDate: text('due_date').notNull(),
    periodFrom: text('period_from'),
    periodTo: text('period_to'),
    subject: text('subject'),
    notes: text('notes'),
    taxBasisPoints: integer('tax_basis_points').notNull(),
    discountBasisPoints: integer('discount_basis_points').notNull(),
    sentOn: text('sent_on'),
    paidOn: text('paid_on'),
  },
  (t) => [
    // lower() equals NOCASE: both fold ASCII only
    uniqueIndex('invoices_number_unique').on(sql`lower(${t.number})`),
    index('invoices_customer_id').on(t.customerId),
    check('invoices_tax_range', sql`${t.taxBasisPoints} BETWEEN 0 AND 10000`),
    check('invoices_discount_range', sql`${t.discountBasisPoints} BETWEEN 0 AND 10000`),
    check('invoices_due_after_issue', sql`${t.dueDate} >= ${t.issueDate}`),
  ],
);

export type Invoice = typeof invoices.$inferSelect;

export const invoiceItems = sqliteTable(
  'invoice_items',
  {
    id: integer('id').primaryKey(),
    invoiceId: integer('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    description: text('description').notNull(),
    quantityHundredths: integer('quantity_hundredths').notNull(),
    unitPriceMinor: integer('unit_price_minor').notNull(),
  },
  (t) => [
    index('invoice_items_invoice_id').on(t.invoiceId),
    check('invoice_items_quantity_not_negative', sql`${t.quantityHundredths} >= 0`),
    check('invoice_items_price_not_negative', sql`${t.unitPriceMinor} >= 0`),
  ],
);

export type InvoiceItem = typeof invoiceItems.$inferSelect;
