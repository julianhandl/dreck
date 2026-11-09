import type { Language } from '@dreck/shared/i18n';

function utc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** Calendar date `YYYY-MM-DD` in the instance language; the date has no time zone. */
export function formatDate(
  date: string,
  language: Language,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(utc(date));
}

/** Range of calendar dates, shared parts once (`15.–21. Jan. 2024`). */
export function formatDateRange(
  from: string,
  to: string,
  language: Language,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).formatRange(
    utc(from),
    utc(to),
  );
}
