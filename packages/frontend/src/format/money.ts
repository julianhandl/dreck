import type { Language } from '@dreck/shared/i18n';
import { currencyFractionDigits, minorToMajor } from '@dreck/shared/money';

// Integer either plain or in groups of three with one separator throughout, then an optional fraction
const AMOUNT = /^(\d{1,3}(?:([.,])\d{3}(?:\2\d{3})*)?|\d+)(?:([.,])(\d+))?$/;

/** Amount in minor units as currency in the instance language (`1250` EUR → `12,50 €`). */
export function formatMoney(amountMinor: number, currency: string, language: Language): string {
  return new Intl.NumberFormat(language, { style: 'currency', currency }).format(
    minorToMajor(amountMinor, currency),
  );
}

/** Amount in minor units as editable text without symbol and grouping (`1250` EUR, de → `12,50`). */
export function formatAmountInput(
  amountMinor: number,
  currency: string,
  language: Language,
): string {
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat(language, {
    useGrouping: false,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minorToMajor(amountMinor, currency));
}

/** Symbol of the currency in the language, e.g. `€` or `$`; the code itself while it is unknown. */
export function currencySymbol(currency: string, language: Language): string {
  try {
    return (
      new Intl.NumberFormat(language, { style: 'currency', currency })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? currency
    );
  } catch {
    // RangeError while the user types an incomplete code
    return currency;
  }
}

/**
 * Parses a tolerant amount (`12,50`, `12.5`, `1.234,50`, `1,234.50`) into minor units.
 * A single separator followed by exactly three digits groups thousands (`1.234` = 1234).
 * Returns `null` for anything else, including negative amounts and too many decimals.
 */
export function parseAmount(input: string, currency: string): number | null {
  const match = AMOUNT.exec(input.replace(/\s/g, ''));
  if (!match) return null;
  const [, integer = '', groupSeparator, decimalSeparator, fraction = ''] = match;
  if (groupSeparator && groupSeparator === decimalSeparator) return null;

  const digits = currencyFractionDigits(currency);
  if (fraction.length > digits) return null;
  return Number(integer.replace(/[.,]/g, '')) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
}
