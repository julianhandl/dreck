/** Number of minor-unit digits of an ISO 4217 currency (EUR: 2, JPY: 0). */
export function currencyFractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/** Converts an amount in minor units to the major unit (1250 EUR cents → 12.5). */
export function minorToMajor(amountMinor: number, currency: string): number {
  return amountMinor / 10 ** currencyFractionDigits(currency);
}
