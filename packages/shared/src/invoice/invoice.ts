/** Lifecycle of an Invoice; Late is not a status but a sent Invoice past its due date. */
export const INVOICE_STATUSES = ['draft', 'sent', 'paid'] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type InvoiceTotals = {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};

/** Amount of an invoice item in minor units, rounded half up: round(quantity × unit price). */
export function itemAmountMinor(quantityHundredths: number, unitPriceMinor: number): number {
  return Math.floor((quantityHundredths * unitPriceMinor + 50) / 100);
}

/** Share of an amount in basis points (2000 = 20 %), rounded half up. */
export function basisPointsOf(amountMinor: number, basisPoints: number): number {
  return Math.floor((amountMinor * basisPoints + 5000) / 10000);
}

/**
 * Sum of the rounded item amounts, minus the discount, plus the tax on the discounted amount.
 * Each step rounds to the smallest unit of the currency.
 */
export function invoiceTotals(
  items: { quantityHundredths: number; unitPriceMinor: number }[],
  discountBasisPoints: number,
  taxBasisPoints: number,
): InvoiceTotals {
  const subtotalMinor = items.reduce(
    (sum, item) => sum + itemAmountMinor(item.quantityHundredths, item.unitPriceMinor),
    0,
  );
  const discountMinor = basisPointsOf(subtotalMinor, discountBasisPoints);
  const taxMinor = basisPointsOf(subtotalMinor - discountMinor, taxBasisPoints);
  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: subtotalMinor - discountMinor + taxMinor,
  };
}

/** Status from the dates: paid wins over sent, without either it is a draft. */
export function invoiceStatus(sentOn: string | null, paidOn: string | null): InvoiceStatus {
  if (paidOn !== null) return 'paid';
  return sentOn !== null ? 'sent' : 'draft';
}

/**
 * Suggestion for the next invoice number: the trailing number of the last one plus 1 with the
 * same zero padding (`RE-2026-009` → `RE-2026-010`); `1` for the first Invoice.
 */
export function nextInvoiceNumber(last: string | undefined): string {
  if (last === undefined) return '1';
  const match = /^(.*?)(\d+)$/.exec(last);
  if (!match) return `${last}-1`;
  const [, prefix = '', digits = ''] = match;
  return `${prefix}${String(Number(digits) + 1).padStart(digits.length, '0')}`;
}
