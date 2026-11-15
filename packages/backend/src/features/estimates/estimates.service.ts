import type {
  CreateEstimate,
  Estimate as EstimateResponse,
  UpdateEstimate,
  UpdateEstimateItem,
} from '@dreck/shared/api/estimates';
import { estimateStatus } from '@dreck/shared/estimate';
import { invoiceTotals, itemAmountMinor, nextInvoiceNumber } from '@dreck/shared/invoice';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { customers } from '@/features/customers/customers.table';
import { getSettings } from '@/features/settings/settings.service';
import { ApiError, fieldError } from '@/http/api-error';
import { type Estimate, type EstimateItem, estimateItems, estimates } from './estimates.table';

/** All Estimates with items and totals, newest issue date first. */
export function listEstimates(db: Db): EstimateResponse[] {
  const rows = db
    .select()
    .from(estimates)
    .orderBy(desc(estimates.issueDate), desc(estimates.id))
    .all();
  const items = db.select().from(estimateItems).orderBy(asc(estimateItems.id)).all();
  const byEstimate = new Map<number, EstimateItem[]>();
  for (const item of items)
    byEstimate.set(item.estimateId, [...(byEstimate.get(item.estimateId) ?? []), item]);
  return rows.map((row) => toResponse(row, byEstimate.get(row.id) ?? []));
}

/** Creates a draft. Missing values come from the Customer and the settings (copy, no live link). */
export function createEstimate(db: Db, input: CreateEstimate): EstimateResponse {
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
      validUntil: input.validUntil ?? null,
      subject: input.subject || null,
      notes: input.notes === undefined ? settings.defaultEstimateNotes : input.notes || null,
      taxBasisPoints: input.taxBasisPoints ?? settings.defaultTaxBasisPoints,
      discountBasisPoints: input.discountBasisPoints ?? 0,
      sentOn: null,
      acceptedOn: null,
      declinedOn: null,
    };
    checkDates(values);
    const estimate = tx.insert(estimates).values(values).returning().get();

    for (const item of input.items ?? []) {
      tx.insert(estimateItems)
        .values({ ...item, estimateId: estimate.id })
        .run();
    }
    return getEstimate(tx, estimate.id);
  });
}

/**
 * Changes an Estimate. Content changes only while it is a draft, or in the same call that turns
 * it back into one (all status dates null); otherwise `409 estimate_locked`.
 */
export function updateEstimate(
  db: Db,
  id: number,
  { items, ...changes }: UpdateEstimate,
): EstimateResponse {
  return db.transaction((tx) => {
    const current = requireEstimate(tx, id);
    const next = { ...current, ...changes };
    const contentChanged =
      items !== undefined ||
      Object.keys(changes).some((k) => k !== 'sentOn' && k !== 'acceptedOn' && k !== 'declinedOn');
    const locked = (e: Estimate): boolean =>
      estimateStatus(e.sentOn, e.acceptedOn, e.declinedOn) !== 'draft';
    if (contentChanged && locked(current) && locked(next)) {
      throw new ApiError('estimate_locked', 'A sent or decided estimate cannot change');
    }
    if (changes.number !== undefined) requireFreeNumber(tx, changes.number, id);
    checkDates(next);

    if (items !== undefined) replaceItems(tx, id, items);
    const set = {
      ...changes,
      ...(changes.subject !== undefined && { subject: changes.subject || null }),
      ...(changes.notes !== undefined && { notes: changes.notes || null }),
    };
    if (Object.keys(set).length > 0)
      tx.update(estimates).set(set).where(eq(estimates.id, id)).run();
    return getEstimate(tx, id);
  });
}

/** Deletes an Estimate in any status, items first. */
export function deleteEstimate(db: Db, id: number): void {
  db.transaction((tx) => {
    requireEstimate(tx, id);
    tx.delete(estimateItems).where(eq(estimateItems.estimateId, id)).run();
    tx.delete(estimates).where(eq(estimates.id, id)).run();
  });
}

function getEstimate(db: Db, id: number): EstimateResponse {
  const items = db
    .select()
    .from(estimateItems)
    .where(eq(estimateItems.estimateId, id))
    .orderBy(asc(estimateItems.id))
    .all();
  return toResponse(requireEstimate(db, id), items);
}

function requireEstimate(db: Db, id: number): Estimate {
  const estimate = db.select().from(estimates).where(eq(estimates.id, id)).get();
  if (!estimate) throw new ApiError('not_found', 'Estimate not found');
  return estimate;
}

function toResponse(estimate: Estimate, items: EstimateItem[]): EstimateResponse {
  return {
    ...estimate,
    status: estimateStatus(estimate.sentOn, estimate.acceptedOn, estimate.declinedOn),
    items: items.map(({ estimateId: _, ...item }) => ({
      ...item,
      amountMinor: itemAmountMinor(item.quantityHundredths, item.unitPriceMinor),
    })),
    ...invoiceTotals(items, estimate.discountBasisPoints, estimate.taxBasisPoints),
  };
}

/** Number of the most recently created Estimate. */
function lastNumber(db: Db): string | undefined {
  return db
    .select({ number: estimates.number })
    .from(estimates)
    .orderBy(desc(estimates.id))
    .limit(1)
    .get()?.number;
}

function requireFreeNumber(db: Db, number: string, exceptId?: number): void {
  const taken = db
    .select({ id: estimates.id })
    .from(estimates)
    .where(
      and(
        eq(sql`lower(${estimates.number})`, number.toLowerCase()),
        exceptId === undefined ? undefined : ne(estimates.id, exceptId),
      ),
    )
    .get();
  if (taken) throw new ApiError('number_taken', 'The estimate number is already used');
}

/** The CHECK constraints are not translated by the error handler, so the service checks first. */
function checkDates(
  e: Pick<Estimate, 'issueDate' | 'validUntil' | 'acceptedOn' | 'declinedOn'>,
): void {
  if (e.validUntil !== null && e.validUntil < e.issueDate) {
    throw fieldError('validUntil', 'validUntil is before issueDate');
  }
  if (e.acceptedOn !== null && e.declinedOn !== null) {
    throw fieldError('declinedOn', 'An estimate cannot be accepted and declined');
  }
}

/** Updates kept items, inserts new ones and removes the rest. */
function replaceItems(db: Db, estimateId: number, items: UpdateEstimateItem[]): void {
  const existing = new Set(
    db
      .select({ id: estimateItems.id })
      .from(estimateItems)
      .where(eq(estimateItems.estimateId, estimateId))
      .all()
      .map((item) => item.id),
  );
  const kept = new Set<number>();
  for (const { id, ...item } of items) {
    if (id === undefined) {
      db.insert(estimateItems)
        .values({ ...item, estimateId })
        .run();
      continue;
    }
    if (!existing.has(id) || kept.has(id)) {
      throw fieldError('items', `Item ${id} does not belong to this estimate`);
    }
    kept.add(id);
    db.update(estimateItems).set(item).where(eq(estimateItems.id, id)).run();
  }
  const removed = [...existing].filter((id) => !kept.has(id));
  if (removed.length > 0) db.delete(estimateItems).where(inArray(estimateItems.id, removed)).run();
}
