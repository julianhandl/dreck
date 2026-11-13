// Calendar dates are `YYYY-MM-DD` strings; the math runs on UTC midnight so no time zone interferes

const DAY_MS = 86_400_000;

export type DateRange = { from: string; to: string };

export const PERIODS = ['week', 'month', 'quarter', 'year'] as const;

export type Period = (typeof PERIODS)[number];

/** Everything; `from`/`to` for API calls that need a range. */
export const ALL_TIME: DateRange = { from: '1970-01-01', to: '9999-12-31' };

function toMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Date `days` later (negative: earlier). */
export function addDays(date: string, days: number): string {
  return fromMs(toMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to`, negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

/** Monday of the week of `date` (ISO week). */
export function startOfWeek(date: string): string {
  const weekday = (new Date(toMs(date)).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

/** The seven dates Monday to Sunday of the week of `date`. */
export function weekDates(date: string): string[] {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** First and last day of the week, month, quarter or year that contains `date`. */
export function periodRange(period: Period, date: string): DateRange {
  if (period === 'week') {
    const from = startOfWeek(date);
    return { from, to: addDays(from, 6) };
  }
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1;
  const firstMonth = { month, quarter: month - (month % 3), year: 0 }[period];
  const months = { month: 1, quarter: 3, year: 12 }[period];
  const from = Date.UTC(year, firstMonth, 1);
  const to = Date.UTC(year, firstMonth + months, 1) - DAY_MS;
  return { from: fromMs(from), to: fromMs(to) };
}

/** The period before (`-1`) or after (`1`) the one that starts at `from`. */
export function shiftPeriod(period: Period, from: string, step: -1 | 1): DateRange {
  const date = step === 1 ? addDays(periodRange(period, from).to, 1) : addDays(from, -1);
  return periodRange(period, date);
}
