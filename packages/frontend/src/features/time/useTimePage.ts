import type { TimeEntry } from '@dreck/shared/api/time-entries';
import type { RoundingMinutes } from '@dreck/shared/report';
import { useEffect, useEffectEvent, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '@/api/api-client';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';
import { elapsedSeconds, useNow, useToday } from '@/clock/useNow';
import { addDays, weekDates } from '@/format/calendar';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useSettings } from '@/settings/useSettings';
import { isForgotten } from './forgotten/forgotten-timer';
import {
  type ForgottenTimer,
  type TimerCommand,
  useForgottenTimer,
} from './forgotten/useForgottenTimer';

export type DialogState = { mode: 'new' } | { mode: 'edit'; entry: TimeEntry } | null;

export type TimeData = {
  catalog: Catalog;
  /** Time Entries of the loaded week. */
  entries: TimeEntry[];
  /** Rows of the selected day; today also a forgotten timer of an earlier day on top. */
  dayEntries: TimeEntry[];
};

export type TimePage = {
  today: string;
  /** Selected day (`?date=`), today by default. */
  date: string;
  week: string[];
  now: number;
  data: QueryState<TimeData>;
  /** Dialog "Neuer Time Entry" or "bearbeiten", `null` while closed. */
  dialog: DialogState;
  timer: Submit<TimerCommand>;
  /** The running Time Entry, also from an earlier week. */
  running: TimeEntry | null;
  /** `running` started more than 10 h ago or on an earlier day. */
  forgotten: boolean;
  /** Question "Wann hast du aufgehört?" before starts and stops of a forgotten timer. */
  forgottenTimer: ForgottenTimer;
  /** Rounding of the instance; `0` = exact. */
  roundingMinutes: RoundingMinutes;
  handleSelectDate: (date: string) => void;
  /** Starts or stops a timer; asks first while the running one was forgotten. */
  handleTimer: (command: TimerCommand) => void;
  handleOpenNew: () => void;
  handleOpenEdit: (entry: TimeEntry) => void;
  handleCloseDialog: () => void;
};

/** State of the time screen: week of the selected day, its Time Entries, timer and dialog. */
export function useTimePage(): TimePage {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? today;
  const week = weekDates(date);
  const [dialog, setDialog] = useState<DialogState>(null);
  const { roundingMinutes, timezone } = useSettings();

  const data = combineQueries(
    useCatalog(),
    useQuery<TimeEntry[]>('/time-entries', { from: week[0], to: week[6] }),
    useQuery<TimeEntry | null>('/timer'),
  );
  const ready = data.status === 'ready' ? data.data : null;
  const running = ready?.[2] ?? null;
  const now = useNow(running !== null);
  const forgotten = running?.runningSince
    ? isForgotten(running.runningSince, now, timezone)
    : false;
  const forgottenTimer = useForgottenTimer(running);

  const timer = useSubmit(async (command: TimerCommand) => {
    const at = new Date().toISOString();
    if ('stop' in command) await api.post('/timer/stop', { at });
    else if ('start' in command)
      await api.post('/timer/start', { timeEntryId: command.start.id, at });
    else await api.post('/timer/start', { ...command.startNew, at });
  });

  const handleTimer = (command: TimerCommand): void => {
    if (forgotten) forgottenTimer.handleAsk(command);
    else void timer.handleSubmit(command);
  };

  const entries = ready?.[1] ?? [];
  // A forgotten timer of an earlier day shows up today, so it gets stopped
  const carriedOver = forgotten && running && running.date !== today && date === today;
  const dayEntries = [
    ...(carriedOver ? [running] : []),
    ...entries.filter((entry) => entry.date === date),
  ];

  const handleSelectDate = (next: string): void => setParams(next === today ? {} : { date: next });

  // ←/→ switch the day, ↑/↓ focus a row of the day, Space starts/stops it, `E` edits it,
  // `N` opens a new entry;
  // all unless the user types somewhere or a dialog is open
  const handleKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    const { target } = event;
    if (!(target instanceof HTMLElement) || event.defaultPrevented || dialog !== null) return;
    if (forgottenTimer.question !== null) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (target.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
    const row = target.closest<HTMLElement>(ROW);
    const entry = dayEntries.find((e) => e.id === Number(row?.dataset.entryId));
    const key = event.key.toLowerCase();

    if (key === 'arrowleft' || key === 'arrowright') {
      event.preventDefault();
      handleSelectDate(addDays(date, key === 'arrowright' ? 1 : -1));
    } else if (key === 'arrowdown' || key === 'arrowup') {
      const rows = [...document.querySelectorAll<HTMLElement>(ROW)];
      const index = row ? rows.indexOf(row) : -1;
      const step = key === 'arrowdown' ? 1 : -1;
      const next = index === -1 ? rows.at(step === 1 ? 0 : -1) : rows[index + step];
      if (!next) return;
      event.preventDefault();
      next.focus();
    } else if (key === 'n') {
      event.preventDefault();
      setDialog({ mode: 'new' });
    } else if (key === 'e' && entry) {
      event.preventDefault();
      setDialog({ mode: 'edit', entry });
    } else if (key === ' ' && entry && target === row) {
      // Space on a button inside the row keeps its native click
      event.preventDefault();
      if (entry.runningSince !== null) handleTimer({ stop: entry });
      else if (entry.date === today) handleTimer({ start: entry });
    }
  });

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    today,
    date,
    week,
    now,
    data: ready
      ? { status: 'ready', data: { catalog: ready[0], entries, dayEntries } }
      : (data as QueryState<never>),
    dialog,
    timer,
    running,
    forgotten,
    forgottenTimer,
    handleTimer,
    roundingMinutes,
    handleSelectDate,
    handleOpenNew: () => setDialog({ mode: 'new' }),
    handleOpenEdit: (entry) => setDialog({ mode: 'edit', entry }),
    handleCloseDialog: () => setDialog(null),
  };
}

/** Selector of a Time Entry row; carries `data-entry-id`. */
const ROW = '[data-entry-id]';

/** Sum of the Time Entries of one day, the running one until now. */
export function dayTotal(entries: TimeEntry[], date: string, now: number): number {
  return entries
    .filter((entry) => entry.date === date)
    .reduce((sum, entry) => sum + elapsedSeconds(entry, now), 0);
}
