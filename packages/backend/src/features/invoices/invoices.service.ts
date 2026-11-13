import type {
  CreateInvoice,
  Invoice as InvoiceResponse,
  UpdateInvoice,
  UpdateInvoiceItem,
} from '@dreck/shared/api/invoices';
import {
  invoiceStatus,
  invoiceTotals,
  itemAmountMinor,
  nextInvoiceNumber,
} from '@dreck/shared/invoice';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { customers } from '@/features/customers/customers.table';
import { expenses } from '@/features/expenses/expenses.table';
import { getSettings } from '@/features/settings/settings.service';
import { timeEntries } from '@/features/time-entries/time-entries.table';
import { ApiError, fieldError } from '@/http/api-error';
import { importItems } from './invoice-import';
import { type Invoice, type InvoiceItem, invoiceItems, invoices } from './invoices.table';

/** All Invoices with items and totals, newest issue date first. */
export function listInvoices(db: Db): InvoiceResponse[] {
  const rows = db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.issueDate), desc(invoices.id))
    .all();
  const items = db.select().from(invoiceItems).orderBy(asc(invoiceItems.id)).all();
  const byInvoice = new Map<number, InvoiceItem[]>();
  for (const item of items)
    byInvoice.set(item.invoiceId, [...(byInvoice.get(item.invoiceId) ?? []), item]);
  return rows.map((row) => toResponse(row, byInvoice.get(row.id) ?? []));
}

/**
 * Creates a draft. Missing values come from the Customer and the settings (copy, no live link);
 * with `import` the uninvoiced Time Entries and Expenses of the range become items and lock.
 */
export function createInvoice(db: Db, input: CreateInvoice): InvoiceResponse {
  return db.transaction((tx) => {
    const customer = tx.select().from(customers).where(eq(customers.id, input.customerId)).get();
    if (!customer) throw fieldError('customerId', 'Customer not found');
    const settings = getSettings(tx);
    const number = input.number ?? nextInvoiceNumber(lastNumber(tx));
    requireFreeNumber(tx, number);

    const values = {
      number,
      customerId: customer.id,
      recipient: input.recipient ?? [customer.name, customer.address].filter(Boolean).join('\n'),
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      periodFrom: input.periodFrom ?? input.import?.from ?? null,
      periodTo: input.periodTo ?? input.import?.to ?? null,
      subject: input.subject || null,
      notes: input.notes === undefined ? settings.defaultInvoiceNotes : input.notes || null,
      taxBasisPoints: input.taxBasisPoints ?? settings.defaultTaxBasisPoints,
      discountBasisPoints: input.discountBasisPoints ?? 0,
      sentOn: null,
      paidOn: null,
    };
    checkDates(values);
    const invoice = tx.insert(invoices).values(values).returning().get();

    for (const item of input.items ?? []) {
      tx.insert(invoiceItems)
        .values({ ...item, invoiceId: invoice.id })
        .run();
    }
    if (input.import) importItems(tx, invoice, input.import, settings);
    return getInvoice(tx, invoice.id);
  });
}

/**
 * Changes an Invoice. Content changes only while it is a draft, or in the same call that turns
 * it back into one (`sentOn` and `paidOn` null); otherwise `409 invoice_locked`.
 */
export function updateInvoice(
  db: Db,
  id: number,
  { items, ...changes }: UpdateInvoice,
): InvoiceResponse {
  return db.transaction((tx) => {
    const current = requireInvoice(tx, id);
    const next = { ...current, ...changes };
    const contentChanged =
      items !== undefined || Object.keys(changes).some((k) => k !== 'sentOn' && k !== 'paidOn');
    const locked = (i: Invoice): boolean => invoiceStatus(i.sentOn, i.paidOn) !== 'draft';
    if (contentChanged && locked(current) && locked(next)) {
      throw new ApiError('invoice_locked', 'A sent or paid invoice cannot change');
    }
    if (changes.number !== undefined) requireFreeNumber(tx, changes.number, id);
    checkDates(next);

    if (items !== undefined) replaceItems(tx, id, items);
    const set = {
      ...changes,
      ...(changes.subject !== undefined && { subject: changes.subject || null }),
      ...(changes.notes !== undefined && { notes: changes.notes || null }),
    };
    if (Object.keys(set).length > 0) tx.update(invoices).set(set).where(eq(invoices.id, id)).run();
    return getInvoice(tx, id);
  });
}

/** Deletes a draft and releases its Time Entries and Expenses; `409 invoice_locked` otherwise. */
export function deleteInvoice(db: Db, id: number): void {
  db.transaction((tx) => {
    const invoice = requireInvoice(tx, id);
    if (invoiceStatus(invoice.sentOn, invoice.paidOn) !== 'draft') {
      throw new ApiError('invoice_locked', 'Only a draft can be deleted');
    }
    const itemIds = tx
      .select({ id: invoiceItems.id })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))
      .all()
      .map((item) => item.id);
    removeItems(tx, itemIds);
    tx.delete(invoices).where(eq(invoices.id, id)).run();
  });
}

function getInvoice(db: Db, id: number): InvoiceResponse {
  const items = db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.id))
    .all();
  return toResponse(requireInvoice(db, id), items);
}

function requireInvoice(db: Db, id: number): Invoice {
  const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice) throw new ApiError('not_found', 'Invoice not found');
  return invoice;
}

function toResponse(invoice: Invoice, items: InvoiceItem[]): InvoiceResponse {
  return {
    ...invoice,
    status: invoiceStatus(invoice.sentOn, invoice.paidOn),
    items: items.map(({ invoiceId: _, ...item }) => ({
      ...item,
      amountMinor: itemAmountMinor(item.quantityHundredths, item.unitPriceMinor),
    })),
    ...invoiceTotals(items, invoice.discountBasisPoints, invoice.taxBasisPoints),
  };
}

/** Number of the most recently created Invoice. */
function lastNumber(db: Db): string | undefined {
  return db
    .select({ number: invoices.number })
    .from(invoices)
    .orderBy(desc(invoices.id))
    .limit(1)
    .get()?.number;
}

function requireFreeNumber(db: Db, number: string, exceptId?: number): void {
  const taken = db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(sql`lower(${invoices.number})`, number.toLowerCase()),
        exceptId === undefined ? undefined : ne(invoices.id, exceptId),
      ),
    )
    .get();
  if (taken) throw new ApiError('number_taken', 'The invoice number is already used');
}

function checkDates(i: Pick<Invoice, 'issueDate' | 'dueDate' | 'periodFrom' | 'periodTo'>): void {
  if (i.dueDate < i.issueDate) throw fieldError('dueDate', 'dueDate is before issueDate');
  if (i.periodFrom !== null && i.periodTo !== null && i.periodTo < i.periodFrom) {
    throw fieldError('periodTo', 'periodTo is before periodFrom');
  }
}

/** Updates kept items, inserts new ones, removes the rest and releases their entries. */
function replaceItems(db: Db, invoiceId: number, items: UpdateInvoiceItem[]): void {
  const existing = new Set(
    db
      .select({ id: invoiceItems.id })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId))
      .all()
      .map((item) => item.id),
  );
  const kept = new Set<number>();
  for (const { id, ...item } of items) {
    if (id === undefined) {
      db.insert(invoiceItems)
        .values({ ...item, invoiceId })
        .run();
      continue;
    }
    if (!existing.has(id) || kept.has(id)) {
      throw fieldError('items', `Item ${id} does not belong to this invoice`);
    }
    kept.add(id);
    db.update(invoiceItems).set(item).where(eq(invoiceItems.id, id)).run();
  }
  removeItems(
    db,
    [...existing].filter((id) => !kept.has(id)),
  );
}

function removeItems(db: Db, itemIds: number[]): void {
  if (itemIds.length === 0) return;
  db.update(timeEntries)
    .set({ invoiceItemId: null })
    .where(inArray(timeEntries.invoiceItemId, itemIds))
    .run();
  db.update(expenses)
    .set({ invoiceItemId: null })
    .where(inArray(expenses.invoiceItemId, itemIds))
    .run();
  db.delete(invoiceItems).where(inArray(invoiceItems.id, itemIds)).run();
}
