import type { TimeEntry, UpdateTimeEntry } from '@dreck/shared/api/time-entries';
import { type KeyboardEvent, type RefObject, useRef, useState } from 'react';
import { api } from '@/api/api-client';
import type { Catalog } from '@/catalog/useCatalog';
import { elapsedSeconds } from '@/clock/useNow';
import { formatDuration, parseDuration } from '@/format/duration';
import { formatAmountInput, parseAmount } from '@/format/money';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import type { NewTimer } from './forgotten/useForgottenTimer';

const MAX_SECONDS = 24 * 3600;

/** The Combobox trigger of the ProjectPicker; the form's other buttons keep their Enter. */
const PICKER_TRIGGER = 'button[aria-haspopup]';

type Command = 'save' | 'delete';

type DialogOptions = {
  catalog: Catalog;
  /** Time Entries of the loaded week: suggestions, prefill and "Heute verwendet". */
  entries: TimeEntry[];
  /** The running Time Entry, also from an earlier week. */
  running: TimeEntry | null;
  /** The running timer was forgotten: starting asks "Wann hast du aufgehört?" first. */
  forgotten: boolean;
  /** Hands a new timer to that question instead of starting it here. */
  onStartForgotten: (start: NewTimer) => void;
  /** The entry to edit; a new one without. */
  entry?: TimeEntry;
  /** Day of a new entry. */
  date: string;
  today: string;
  now: number;
  /** Closes the dialog after saving or deleting. */
  onClose: () => void;
};

export type TimeEntryDialog = {
  projectId: number | null;
  description: string;
  date: string;
  duration: string;
  /** Hourly Rate of an edited entry as text; follows a new Project until edited by hand. */
  rate: string;
  /** Today without a duration starts a timer instead of saving. */
  startsTimer: boolean;
  /** "Stoppt X (0:47) und startet den neuen Timer." or `null`. */
  stopsHint: string | null;
  suggestions: string[];
  usedToday: number[];
  submit: Submit<Command>;
  /** Duration input; focused when editing, the Project picker otherwise. */
  durationRef: RefObject<HTMLInputElement | null>;
  initialFocus: RefObject<HTMLInputElement | null> | undefined;
  /** Back to the element focused before opening, if it still exists. */
  finalFocus: () => boolean;
  /** Enter on the Project picker submits like in the inputs instead of opening the popup. */
  handleKeyDownCapture: (event: KeyboardEvent<HTMLFormElement>) => void;
  handleProjectChange: (projectId: number) => void;
  handleDescriptionChange: (value: string) => void;
  handleDateChange: (value: string) => void;
  handleDurationChange: (value: string) => void;
  handleRateChange: (value: string) => void;
  /** The folded Hourly Rate section is open. */
  rateOpen: boolean;
  handleRateToggle: (open: boolean) => void;
};

/** Form state of the dialog "Neuer Time Entry" / "Time Entry bearbeiten". */
export function useTimeEntryDialog(options: DialogOptions): TimeEntryDialog {
  const { catalog, entries, entry, running, today, now, onClose } = options;
  const { messages, language } = useI18n();
  const { currency } = useSettings();
  const rateText = (minor: number): string => formatAmountInput(minor, currency, language);
  const durationRef = useRef<HTMLInputElement>(null);
  // Focused before opening, e.g. a row picked with ↑/↓; Base UI would skip it (not tabbable)
  const [opener] = useState(() => document.activeElement);
  // Fixed when the dialog opens; a running entry keeps ticking in the list meanwhile
  const [initialDuration] = useState(() =>
    entry ? formatDuration(elapsedSeconds(entry, now)) : '',
  );

  const [projectId, setProjectId] = useState<number | null>(
    entry?.projectId ?? running?.projectId ?? lastProjectId(entries, catalog),
  );
  const [description, setDescription] = useState(entry?.description ?? '');
  const [date, setDate] = useState(entry?.date ?? options.date);
  const [duration, setDuration] = useState(initialDuration);
  const [rate, setRate] = useState(() => (entry ? rateText(entry.hourlyRateMinor) : ''));
  // Edited by hand: the rate no longer follows the Project and is sent as a correction
  const [rateEdited, setRateEdited] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const startsTimer = !entry && date === today && duration.trim() === '';
  const runningName = running ? (catalog.project(running.projectId)?.name ?? '') : '';
  const stopsHint =
    startsTimer && running && !options.forgotten
      ? messages.time.dialog.stopsRunning(runningName, formatDuration(elapsedSeconds(running, now)))
      : null;

  function validate(command: Command): Record<string, string> {
    if (command === 'delete') return {};
    const errors: Record<string, string> = {};
    if (projectId === null) errors.projectId = messages.time.errors.projectRequired;
    if (entry && parseAmount(rate, currency) === null)
      errors.hourlyRateMinor = messages.expenses.errors.amount;
    if (duration.trim() === '') {
      if (!startsTimer && !entry?.runningSince)
        errors.duration = messages.time.errors.durationRequired;
      return errors;
    }
    const seconds = parseDuration(duration);
    if (seconds === null) errors.duration = messages.time.errors.durationFormat;
    else if (seconds <= 0 || seconds > MAX_SECONDS)
      errors.duration = messages.time.errors.durationRange;
    return errors;
  }

  const submit = useSubmit(
    async (command: Command) => {
      if (command === 'delete' && entry) {
        await api.delete(`/time-entries/${entry.id}`);
      } else if (entry) {
        await api.patch(`/time-entries/${entry.id}`, changes(entry));
      } else if (startsTimer && projectId !== null) {
        const start = { projectId, description: description.trim() || undefined };
        if (options.forgotten) options.onStartForgotten(start);
        else await api.post('/timer/start', { ...start, at: new Date().toISOString() });
      } else {
        await api.post('/time-entries', {
          projectId,
          date,
          durationSeconds: parseDuration(duration),
          description: description.trim() || undefined,
        });
      }
      onClose();
    },
    { validate },
  );

  // Only changed fields: a running entry restarts its clock when it gets a duration
  function changes(current: TimeEntry): UpdateTimeEntry {
    const body: UpdateTimeEntry = {};
    const moved = projectId !== null && projectId !== current.projectId;
    if (moved) body.projectId = projectId;
    // Sent along with a move it wins over the new Project's rate
    const rateMinor = parseAmount(rate, currency);
    if (rateEdited && rateMinor !== null && (moved || rateMinor !== current.hourlyRateMinor))
      body.hourlyRateMinor = rateMinor;
    if (date !== current.date) body.date = date;
    if (description.trim() !== (current.description ?? ''))
      body.description = description.trim() || null;
    if (duration !== initialDuration) body.durationSeconds = parseDuration(duration) ?? 0;
    return body;
  }

  const suggestions = [
    ...new Set(
      entries
        .filter((e) => e.projectId === projectId && e.description)
        .map((e) => e.description ?? ''),
    ),
  ];
  const usedToday = [...new Set(entries.filter((e) => e.date === today).map((e) => e.projectId))];

  return {
    projectId,
    description,
    date,
    duration,
    rate,
    startsTimer,
    stopsHint,
    suggestions,
    usedToday,
    submit,
    durationRef,
    initialFocus: entry ? durationRef : undefined,
    finalFocus: () => {
      if (!(opener instanceof HTMLElement && opener.isConnected)) return true;
      // Focus it here: a returned element that is not tabbable gets its first tabbable child
      opener.focus();
      return false;
    },
    handleKeyDownCapture: (event) => {
      if (event.key !== 'Enter' || !(event.target instanceof HTMLElement)) return;
      if (!event.target.closest(PICKER_TRIGGER)) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.requestSubmit();
    },
    handleProjectChange: (id) => {
      setProjectId(id);
      // Preview of the move: the entry takes over the rate of the new Project
      const project = catalog.project(id);
      if (entry && !rateEdited && project) setRate(rateText(project.hourlyRateMinor));
    },
    handleDescriptionChange: setDescription,
    handleDateChange: setDate,
    handleDurationChange: setDuration,
    rateOpen,
    handleRateToggle: setRateOpen,
    handleRateChange: (value) => {
      setRateEdited(true);
      setRate(value);
    },
  };
}

// The last started entry: highest id of the week, if its Project can still be picked;
// without one the only selectable Project, e.g. right after the onboarding
function lastProjectId(entries: TimeEntry[], catalog: Catalog): number | null {
  const selectable = catalog.selectable.flatMap((g) => g.projects.map((p) => p.id));
  const last = entries
    .filter((e) => selectable.includes(e.projectId))
    .reduce<TimeEntry | null>((best, e) => (best === null || e.id > best.id ? e : best), null);
  return last?.projectId ?? (selectable.length === 1 ? (selectable[0] ?? null) : null);
}
