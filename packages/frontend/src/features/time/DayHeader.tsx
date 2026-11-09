import type { ReactElement } from 'react';
import { addDays } from '@/format/calendar';
import { formatDate } from '@/format/date';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { ArrowLeftIcon, ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from '@/ui/icons';

type DayHeaderProps = {
  /** Selected day. */
  date: string;
  /** Today in the time zone of the instance. */
  today: string;
  /** Called with the day to show. */
  onSelectDate: (date: string) => void;
};

/**
 * Desktop: ← → buttons, the selected day as page heading, "Zurück zu heute" and a date input.
 * Mobile: heading "Zeit", the day as a pill that opens the date picker, ‹ › on the right.
 * @example <DayHeader date={date} today={today} onSelectDate={handleSelectDate} />
 */
export function DayHeader({ date, today, onSelectDate }: DayHeaderProps): ReactElement {
  const { language, messages } = useI18n();
  const titleFor = (weekday: 'long' | 'short'): string => {
    const day = formatDate(date, language, { weekday, day: 'numeric', month: 'short' });
    return date === today ? messages.time.today(day) : day;
  };
  const title = titleFor('long');
  // Mobile: short weekday, so the title fits next to "Heute" and the arrows
  const shortTitle = titleFor('short');
  const handleDateChange = (value: string): void => {
    if (value) onSelectDate(value);
  };

  return (
    <>
      {/* Mobile (design/mobile-time.png) */}
      <div className="flex flex-col gap-4 sm:hidden">
        <h1 className="sr-only">{messages.nav.time}</h1>
        <div className="flex items-center gap-2">
          <label className="relative inline-flex min-h-11 min-w-0 items-center rounded-temp-control border border-temp-border px-4 text-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-temp-focus">
            <span className="truncate">{shortTitle}</span>
            <input
              type="date"
              aria-label={messages.time.pickDate}
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
              onClick={(event) => event.currentTarget.showPicker?.()}
              className="absolute inset-0 opacity-0"
            />
          </label>
          {/* In the row instead of below it, so switching days keeps the height */}
          {date !== today && (
            <Button
              variant="link"
              size="sm"
              aria-label={messages.time.backToToday}
              onClick={() => onSelectDate(today)}
            >
              {messages.time.todayShort}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label={messages.time.previousDay}
            onClick={() => onSelectDate(addDays(date, -1))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={messages.time.nextDay}
            onClick={() => onSelectDate(addDays(date, 1))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* Desktop (design/new-time-entry.png) */}
      <div className="hidden flex-wrap items-center gap-4 sm:flex">
        <div className="flex">
          <Button
            size="icon"
            className="rounded-r-none"
            aria-label={messages.time.previousDay}
            onClick={() => onSelectDate(addDays(date, -1))}
          >
            <ArrowLeftIcon />
          </Button>
          <Button
            size="icon"
            className="-ml-px rounded-l-none"
            aria-label={messages.time.nextDay}
            onClick={() => onSelectDate(addDays(date, 1))}
          >
            <ArrowRightIcon />
          </Button>
        </div>
        <h1 className="font-semibold text-3xl">{title}</h1>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {date !== today && (
            <Button variant="link" size="sm" onClick={() => onSelectDate(today)}>
              {messages.time.backToToday}
            </Button>
          )}
          <label className="flex items-center">
            <span className="sr-only">{messages.time.pickDate}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
              className="min-h-11 rounded-temp-control border border-temp-border bg-temp-surface px-3"
            />
          </label>
        </div>
      </div>
    </>
  );
}
