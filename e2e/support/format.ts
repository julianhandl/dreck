const EURO = new Intl.NumberFormat('de', { style: 'currency', currency: 'EUR' });

/** Amount in cents as the app shows it with language `de` (`33750` → `337,50 €`). */
export function euro(amountMinor: number): string {
  return EURO.format(amountMinor / 100);
}
