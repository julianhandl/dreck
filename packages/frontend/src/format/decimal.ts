import type { Language } from '@dreck/shared/i18n';

// Integer either plain or in groups of three with one separator throughout, then an optional fraction
const DECIMAL = /^(\d{1,3}(?:([.,])\d{3}(?:\2\d{3})*)?|\d+)(?:([.,])(\d+))?$/;

/**
 * Parses a tolerant, non-negative decimal (`12,50`, `12.5`, `1.234,50`) into an integer scaled by
 * `10^digits` (`1,5` with 2 digits → 150). A single separator followed by exactly three digits
 * groups thousands (`1.234` = 1234). Returns `null` for anything else, including too many decimals.
 */
export function parseDecimal(input: string, digits: number): number | null {
  const match = DECIMAL.exec(input.replace(/\s/g, ''));
  if (!match) return null;
  const [, integer = '', groupSeparator, decimalSeparator, fraction = ''] = match;
  if (groupSeparator && groupSeparator === decimalSeparator) return null;
  if (fraction.length > digits) return null;
  return Number(integer.replace(/[.,]/g, '')) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
}

/** Scaled integer as editable text without grouping (`150`, 2 digits, de → `1,50`). */
export function formatDecimalInput(value: number, digits: number, language: Language): string {
  return new Intl.NumberFormat(language, {
    useGrouping: false,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 10 ** digits);
}

/** Basis points as editable percent, trailing zeros dropped (`2000` → `20`, `1050`, de → `10,5`). */
export function formatPercentInput(basisPoints: number, language: Language): string {
  return new Intl.NumberFormat(language, { useGrouping: false, maximumFractionDigits: 2 }).format(
    basisPoints / 100,
  );
}

/** Percent text into basis points, 0–100 % with up to two decimals; otherwise `null`. */
export function parsePercent(input: string): number | null {
  const value = parseDecimal(input, 2);
  return value !== null && value <= 10000 ? value : null;
}

/** Basis points as percent in the language (`2000`, de → `20 %`). */
export function formatPercent(basisPoints: number, language: Language): string {
  return new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 2 }).format(
    basisPoints / 10000,
  );
}
