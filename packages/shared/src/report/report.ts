/** Allowed Rounding steps in minutes; 0 means exact duration. */
export const ROUNDING_MINUTES = [0, 5, 6, 10, 15, 30, 60] as const;

export type RoundingMinutes = (typeof ROUNDING_MINUTES)[number];

/**
 * Rounds a single Time Entry's duration up to the next Rounding step; only full minutes count
 * (15:59 at 15 stays 15:00, 16:00 becomes 30:00).
 */
export function roundSeconds(seconds: number, roundingMinutes: RoundingMinutes): number {
  if (roundingMinutes === 0) return seconds;
  return Math.ceil(Math.floor(seconds / 60) / roundingMinutes) * roundingMinutes * 60;
}

/** Amount of a Time Entry in minor units, rounded half up: round(rate × seconds / 3600). */
export function amountMinor(hourlyRateMinor: number, seconds: number): number {
  return Math.floor((hourlyRateMinor * seconds + 1800) / 3600);
}
