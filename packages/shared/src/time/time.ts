/** Wall clock parts of an instant in an IANA time zone, 24-hour clock. */
function wallClock(instantMs: number, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instantMs);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** Calendar date (`YYYY-MM-DD`) of an instant in an IANA time zone. */
export function dateInTimeZone(instantMs: number, timeZone: string): string {
  const { year, month, day } = wallClock(instantMs, timeZone);
  return `${year}-${month}-${day}`;
}

/** Time of day (`HH:MM`) of an instant in an IANA time zone. */
export function timeInTimeZone(instantMs: number, timeZone: string): string {
  const { hour, minute } = wallClock(instantMs, timeZone);
  return `${hour}:${minute}`;
}

/**
 * Instant of a wall clock time (`YYYY-MM-DD`, `HH:MM`) in an IANA time zone. A time skipped by
 * the switch to daylight saving time lands an hour later; a repeated one takes the second.
 */
export function instantInTimeZone(date: string, time: string, timeZone: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const first = wall - offsetMs(wall, timeZone);
  // Near a switch the offset at the result differs from the one at `wall`; once more fixes it
  return wall - offsetMs(first, timeZone);
}

/** Offset of the time zone at an instant: wall clock minus UTC, in ms. */
function offsetMs(instantMs: number, timeZone: string): number {
  const p = wallClock(instantMs, timeZone);
  const shown = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
  );
  return shown - Math.floor(instantMs / 60_000) * 60_000;
}
