import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { dateInTimeZone, instantInTimeZone, timeInTimeZone } from '@dreck/shared/time';
import { useState } from 'react';
import { ApiError, api } from '@/api/api-client';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';

/** A new timer on a Project, as started from the dialog "Neuer Time Entry". */
export type NewTimer = { projectId: number; taskId?: number; description?: string };

/** What the user wanted to do with the timer before the question came up. */
export type TimerCommand = { start: TimeEntry } | { stop: TimeEntry } | { startNew: NewTimer };

/** `stoppedAt`: the forgotten timer ends at the entered time; `untilNow`: worked until now. */
export type ForgottenAnswer = 'stoppedAt' | 'untilNow';

export type ForgottenTimer = {
  /** The command waiting for the answer; the question is open while set. */
  question: TimerCommand | null;
  /** Day the forgotten timer started, in the instance time zone (`YYYY-MM-DD`). */
  startDate: string;
  /** Time it started (`HH:MM`). */
  startTime: string;
  /** Entered time of day on `startDate` (`HH:MM`). */
  stoppedAt: string;
  submit: Submit<ForgottenAnswer>;
  handleAsk: (command: TimerCommand) => void;
  handleCancel: () => void;
  handleStoppedAtChange: (value: string) => void;
};

/**
 * Question "Wann hast du aufgehört?" before every start or stop while the running timer was
 * forgotten. The answer stops it at that time (not stored anywhere else), then runs the command.
 */
export function useForgottenTimer(running: TimeEntry | null): ForgottenTimer {
  const { messages } = useI18n();
  const { timezone } = useSettings();
  const [question, setQuestion] = useState<TimerCommand | null>(null);
  const [stoppedAt, setStoppedAt] = useState('');
  const since = running?.runningSince ? Date.parse(running.runningSince) : 0;
  const startDate = dateInTimeZone(since, timezone);
  const startTime = timeInTimeZone(since, timezone);

  function validate(answer: ForgottenAnswer): Record<string, string> {
    if (answer === 'untilNow') return {};
    if (stoppedAt === '') return { stoppedAt: messages.forgotten.timeRequired };
    // Same minute as the start counts as the start itself
    const at = instantInTimeZone(startDate, stoppedAt, timezone);
    return at < Math.floor(since / 60_000) * 60_000
      ? { stoppedAt: messages.forgotten.beforeStart(startTime) }
      : {};
  }

  const submit = useSubmit(
    async (answer: ForgottenAnswer) => {
      if (question === null) return;
      const now = new Date().toISOString();
      if (answer === 'stoppedAt') {
        const at = Math.max(since, instantInTimeZone(startDate, stoppedAt, timezone));
        await stopIgnoringStopped(new Date(at).toISOString());
      }
      if ('startNew' in question) await api.post('/timer/start', { ...question.startNew, at: now });
      else if ('start' in question)
        await api.post('/timer/start', { timeEntryId: question.start.id, at: now });
      else if (answer === 'untilNow') await api.post('/timer/stop', { at: now });
      setQuestion(null);
      setStoppedAt('');
    },
    { validate },
  );

  return {
    question,
    startDate,
    startTime,
    stoppedAt,
    submit,
    handleAsk: setQuestion,
    handleCancel: () => setQuestion(null),
    handleStoppedAtChange: setStoppedAt,
  };
}

// "Erneut versuchen" after a failed start sends the stop again; it already went through then
async function stopIgnoringStopped(at: string): Promise<void> {
  try {
    await api.post('/timer/stop', { at });
  } catch (error) {
    if (!(error instanceof ApiError && error.code === 'no_running_timer')) throw error;
  }
}
