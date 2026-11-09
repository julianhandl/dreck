import { dateInTimeZone } from '@dreck/shared/time';

/** A timer running longer than this counts as forgotten. */
export const FORGOTTEN_AFTER_MS = 10 * 3600 * 1000;

/**
 * Whether a running Time Entry was probably forgotten: started more than 10 h ago or on an
 * earlier day in the instance time zone.
 */
export function isForgotten(runningSince: string, now: number, timeZone: string): boolean {
  const since = Date.parse(runningSince);
  return (
    now - since > FORGOTTEN_AFTER_MS ||
    dateInTimeZone(since, timeZone) < dateInTimeZone(now, timeZone)
  );
}
