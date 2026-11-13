import { describe, expect, test } from 'bun:test';
import { invoiceStatus, invoiceTotals, itemAmountMinor, nextInvoiceNumber } from './invoice';

describe('invoice', () => {
  test.each([
    [1917, 10000, 191700], // 19.17 h × 100.00
    [100, 1250, 1250],
    [33, 1, 0], // 0.33 cent rounds down
    [50, 1, 1], // 0.5 cent rounds up
    [0, 9000, 0],
  ])('item amount %i × %i = %i', (quantity, price, amount) => {
    expect(itemAmountMinor(quantity, price)).toBe(amount);
  });

  test('totals: discount first, tax on the discounted amount', () => {
    const items = [
      { quantityHundredths: 1917, unitPriceMinor: 10000 },
      { quantityHundredths: 1075, unitPriceMinor: 10000 },
    ];
    expect(invoiceTotals(items, 1000, 2000)).toEqual({
      subtotalMinor: 299200,
      discountMinor: 29920,
      taxMinor: 53856,
      totalMinor: 323136,
    });
  });

  test('totals round each step half up', () => {
    // 3.33 × 20 % = 0.666 → 0.67
    expect(invoiceTotals([{ quantityHundredths: 100, unitPriceMinor: 333 }], 0, 2000)).toEqual({
      subtotalMinor: 333,
      discountMinor: 0,
      taxMinor: 67,
      totalMinor: 400,
    });
  });

  test('status: paid wins over sent', () => {
    expect(invoiceStatus(null, null)).toBe('draft');
    expect(invoiceStatus('2026-03-01', null)).toBe('sent');
    expect(invoiceStatus('2026-03-01', '2026-03-05')).toBe('paid');
    expect(invoiceStatus(null, '2026-03-05')).toBe('paid');
  });

  test.each([
    [undefined, '1'],
    ['1', '2'],
    ['9', '10'],
    ['RE-2026-009', 'RE-2026-010'],
    ['RE-2026-099', 'RE-2026-100'],
    ['2026/07', '2026/08'],
    ['ACME', 'ACME-1'],
  ])('next number after %p is %p', (last, next) => {
    expect(nextInvoiceNumber(last)).toBe(next);
  });
});
