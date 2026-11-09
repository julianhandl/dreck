import type { TimeEntry } from '@dreck/shared/api/time-entries';
import type { ReactElement } from 'react';
import { formatDate } from '@/format/date';
import { formatDuration } from '@/format/duration';
import { useI18n } from '@/i18n/useI18n';
import { dayTotal } from './useTimePage';

type WeekBarProps = {
  /** Monday to Sunday. */
  week: string[];
  /** Selected day, underlined. */
  date: string;
  /** Time Entries of the week. */
  entries: TimeEntry[];
  /** Current time for running Time Entries. */
  now: number;
  /** Called with the clicked day. */
  onSelectDate: (date: string) => void;
};

/**
 * Seven day buttons with their totals and the week total; the selected day is underlined.
 * @example <WeekBar week={week} date={date} entries={entries} now={now} onSelectDate={select} />
 */
export function WeekBar({ week, date, entries, now, onSelectDate }: WeekBarProps): ReactElement {
  const { language, messages } = useI18n();
  const weekTotal = week.reduce((sum, day) => sum + dayTotal(entries, day, now), 0);

  return (
    <>
      <nav aria-label={messages.time.week} className="border-temp-divider border-b">
        <ul className="grid grid-cols-7 sm:grid-cols-8">
          {week.map((day) => (
            <li key={day}>
              <button
                type="button"
                aria-current={day === date ? 'date' : undefined}
                onClick={() => onSelectDate(day)}
                className="group flex w-full flex-col items-center gap-1 py-2 text-center hover:bg-temp-band sm:items-start sm:gap-0 sm:border-transparent sm:border-b-4 sm:px-2 sm:text-left sm:aria-[current=date]:border-temp-primary"
              >
                <span
                  aria-hidden="true"
                  className="text-temp-ink-muted text-xs uppercase sm:text-base sm:text-temp-ink sm:normal-case"
                >
                  {formatDate(day, language, { weekday: 'short' })}
                </span>
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full font-semibold text-xl group-aria-[current=date]:bg-temp-primary group-aria-[current=date]:text-temp-on-primary sm:hidden"
                >
                  {formatDate(day, language, { day: 'numeric' }).replace('.', '')}
                </span>
                <span className="sr-only">{formatDate(day, language, { dateStyle: 'full' })}</span>
                <span className="text-sm text-temp-ink-muted sm:text-base">
                  {formatDuration(dayTotal(entries, day, now))}
                </span>
              </button>
            </li>
          ))}
          <li className="hidden flex-col items-end px-2 py-2 sm:col-start-8 sm:flex">
            <span>{messages.time.weekTotal}</span>
            <span className="font-semibold">{formatDuration(weekTotal)}</span>
          </li>
        </ul>
      </nav>
      {/* Mobile: week total above the cards */}
      <p className="pt-5 text-lg sm:hidden">
        {messages.time.weekTotal}: {formatDuration(weekTotal)}
      </p>
    </>
  );
}
