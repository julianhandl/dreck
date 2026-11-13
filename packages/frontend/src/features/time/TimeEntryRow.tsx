import type { Customer } from '@dreck/shared/api/customers';
import type { Project } from '@dreck/shared/api/projects';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { type RoundingMinutes, roundSeconds } from '@dreck/shared/report';
import type { ReactElement } from 'react';
import { elapsedSeconds } from '@/clock/useNow';
import { formatDuration } from '@/format/duration';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { PlayIcon, StopIcon } from '@/ui/icons';
import { Pill } from '@/ui/Pill';
import { projectColorStyle } from '@/ui/project-color';

type TimeEntryRowProps = {
  entry: TimeEntry;
  /** Project of the entry; missing only while the lists load again. */
  project: Project | undefined;
  /** Customer of the Project. */
  customer: Customer | undefined;
  /** Current time for a running entry. */
  now: number;
  /** Rounding of the instance; shows the rounded duration below unless `0`. */
  roundingMinutes: RoundingMinutes;
  /** ▶ only on rows of today that are not invoiced. */
  startable: boolean;
  /** A timer call runs; the buttons ignore clicks meanwhile. */
  pending: boolean;
  /** Starts the timer on this entry. */
  onStart: () => void;
  /** Stops this running entry. */
  onStop: () => void;
  /** Opens the dialog "Time Entry bearbeiten". */
  onEdit: () => void;
};

/**
 * One Time Entry: Project (Customer), description, duration with the rounded one below,
 * Start/Stopp and Bearbeiten; a running entry is highlighted. The row takes focus from ↑/↓
 * for Space and `E`.
 * @example <TimeEntryRow entry={entry} project={p} customer={c} now={now} roundingMinutes={15} startable … />
 */
export function TimeEntryRow({
  entry,
  project,
  customer,
  now,
  roundingMinutes,
  startable,
  pending,
  onStart,
  onStop,
  onEdit,
}: TimeEntryRowProps): ReactElement {
  const { messages } = useI18n();
  const running = entry.runningSince !== null;
  const name = project?.name ?? '';
  const seconds = elapsedSeconds(entry, now);
  const duration = formatDuration(seconds);

  // Mobile: white card, ▶/■ with the duration, the whole card edits (stretched edit button)
  return (
    // Focusable via ↑/↓ only (see useTimePage); the focus ring is the highlight
    <li
      data-entry-id={entry.id}
      tabIndex={-1}
      aria-keyshortcuts={startable || running ? 'Space E' : 'E'}
      className={`relative flex focus-visible:-outline-offset-2 items-center gap-4 rounded-temp-card p-4 shadow-temp-card sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:rounded-none sm:border-temp-divider sm:first:rounded-t-temp-card sm:last:rounded-b-temp-card sm:border-b sm:px-5 sm:shadow-none sm:last:border-b-0 ${running ? 'bg-temp-timer-soft' : 'bg-temp-surface'}`}
    >
      <div className="flex min-w-0 flex-1 gap-3 sm:basis-60">
        <span
          aria-hidden="true"
          className="mt-1.5 size-3 shrink-0 rounded-full bg-temp-project"
          style={projectColorStyle(entry.projectId)}
        />
        <div className="min-w-0">
          <p>
            <span className="font-medium">{name}</span>
            {customer && <span> ({customer.name})</span>}
          </p>
          {entry.description && <p className="text-temp-ink-muted">{entry.description}</p>}
          {entry.invoiceItemId !== null && <Pill>{messages.common.invoiced}</Pill>}
        </div>
      </div>
      {/* Mobile: ▶/■ in the top right corner of the card, the rounded duration below */}
      <div className="ml-auto flex items-center gap-x-6 max-sm:flex-col-reverse max-sm:items-end max-sm:gap-1 max-sm:self-start">
        <div className="flex flex-col items-end">
          <span
            className={`font-medium text-xl tracking-tight sm:text-2xl ${running || startable ? 'max-sm:sr-only' : ''}`}
          >
            {duration}
          </span>
          {roundingMinutes !== 0 && (
            <span className="text-sm text-temp-ink-muted">
              <span aria-hidden="true">~</span>
              <span className="sr-only">{messages.time.rounded}: </span>
              {formatDuration(roundSeconds(seconds, roundingMinutes))}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {running && (
            <Button
              variant="primary"
              aria-disabled={pending}
              aria-label={messages.time.stopFor(name)}
              onClick={onStop}
              className="relative z-10 w-28 text-xl sm:text-base max-sm:-mt-4 max-sm:-mr-4 max-sm:rounded-none max-sm:rounded-tr-temp-card max-sm:rounded-bl-temp-card"
            >
              <StopIcon />
              <span className="sm:hidden">{duration}</span>
              <span className="hidden sm:inline">{messages.time.stop}</span>
            </Button>
          )}
          {!running && startable && (
            <Button
              variant="timer"
              aria-disabled={pending}
              aria-label={messages.time.startFor(name)}
              onClick={onStart}
              className="relative z-10 w-28 text-xl sm:text-base max-sm:-mt-4 max-sm:-mr-4 max-sm:rounded-none max-sm:rounded-tr-temp-card max-sm:rounded-bl-temp-card"
            >
              <PlayIcon />
              <span className="sm:hidden">{duration}</span>
              <span className="hidden sm:inline">{messages.time.start}</span>
            </Button>
          )}
          <Button
            size="sm"
            aria-label={messages.time.editFor(name)}
            onClick={onEdit}
            className="min-h-11 max-sm:absolute max-sm:inset-0 max-sm:size-full max-sm:rounded-[inherit] max-sm:border-transparent max-sm:bg-transparent max-sm:text-transparent max-sm:shadow-none"
          >
            {messages.common.edit}
          </Button>
        </div>
      </div>
    </li>
  );
}
