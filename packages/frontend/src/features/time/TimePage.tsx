import type { ReactElement } from 'react';
import { formatDuration } from '@/format/duration';
import { FormStatus } from '@/forms/FormStatus';
import { useI18n } from '@/i18n/useI18n';
import { PlusIcon } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { DayHeader } from './DayHeader';
import { ForgottenTimerDialog } from './forgotten/ForgottenTimerDialog';
import { TimeEntryDialog } from './TimeEntryDialog';
import { TimeEntryRow } from './TimeEntryRow';
import { dayTotal, useTimePage } from './useTimePage';
import { WeekBar } from './WeekBar';

/**
 * Time screen: selected day with the week bar above, its Time Entries, timer and the dialog
 * for new entries. Keyboard: ←/→ switch the day, ↑/↓ focus a row, Space starts/stops it,
 * `E` edits it, `N` is new.
 * @example <Route index element={<TimePage />} />
 */
export function TimePage(): ReactElement {
  const { messages } = useI18n();
  const page = useTimePage();

  return (
    <Page>
      <DayHeader date={page.date} today={page.today} onSelectDate={page.handleSelectDate} />
      <div className="flex flex-col gap-6 sm:flex-row">
        {/* Mobile: floating round button at the bottom right */}
        <div className="flex shrink-0 flex-col items-center gap-2 max-sm:fixed max-sm:right-4 max-sm:bottom-6 max-sm:z-20">
          <button
            type="button"
            onClick={page.handleOpenNew}
            aria-keyshortcuts="N"
            className="flex size-16 items-center justify-center rounded-full bg-temp-primary text-temp-on-primary shadow-lg hover:bg-temp-primary-hover sm:size-20 sm:shadow-temp-card"
          >
            <PlusIcon width="2.5rem" height="2.5rem" />
            <span className="sr-only">{messages.time.track}</span>
          </button>
          <span aria-hidden="true" className="hidden text-sm sm:inline">
            {messages.time.track}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <QueryView state={page.data}>
            {({ catalog, entries, dayEntries }) => {
              const runningName = page.running
                ? (catalog.project(page.running.projectId)?.name ?? '')
                : '';
              return (
                <>
                  <WeekBar
                    week={page.week}
                    date={page.date}
                    entries={entries}
                    now={page.now}
                    onSelectDate={page.handleSelectDate}
                  />
                  {/* Mobile: room below the cards for the floating button */}
                  <div className="max-sm:pb-24">
                    {page.timer.offline && (
                      <p className="mt-3 text-temp-ink-muted">{messages.time.timerKeepsRunning}</p>
                    )}
                    <FormStatus submit={page.timer} />
                    {page.forgotten && page.date === page.today && (
                      <p className="mt-4 rounded-temp-card border border-temp-highlight-border bg-temp-highlight px-5 py-3">
                        {messages.forgotten.notice(runningName)}
                      </p>
                    )}
                    {dayEntries.length === 0 ? (
                      <p className="mt-4 rounded-temp-card border border-temp-divider border-dashed px-6 py-12 text-center text-temp-ink-muted">
                        {messages.time.empty}
                      </p>
                    ) : (
                      <>
                        <ul className="mt-4 flex flex-col gap-3 sm:gap-0 sm:overflow-hidden sm:rounded-temp-card sm:bg-temp-surface sm:shadow-temp-card">
                          {dayEntries.map((entry) => {
                            const project = catalog.project(entry.projectId);
                            return (
                              <TimeEntryRow
                                key={entry.id}
                                entry={entry}
                                project={project}
                                customer={project && catalog.customerOf(project)}
                                now={page.now}
                                roundingMinutes={page.roundingMinutes}
                                startable={page.isStartable(entry)}
                                pending={page.timer.pending}
                                onStart={() => page.handleTimer({ start: entry })}
                                onStop={() => page.handleTimer({ stop: entry })}
                                onEdit={() => page.handleOpenEdit(entry)}
                              />
                            );
                          })}
                        </ul>
                        <p className="flex justify-end gap-6 px-5 py-4 text-lg">
                          <span>{messages.common.total}:</span>
                          <span className="font-medium text-temp-primary">
                            {formatDuration(dayTotal(entries, page.date, page.now))}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                  {page.dialog && (
                    <TimeEntryDialog
                      catalog={catalog}
                      entries={entries}
                      running={page.running}
                      forgotten={page.forgotten}
                      onStartForgotten={(startNew) => page.handleTimer({ startNew })}
                      entry={page.dialog.mode === 'edit' ? page.dialog.entry : undefined}
                      date={page.date}
                      today={page.today}
                      now={page.now}
                      onClose={page.handleCloseDialog}
                    />
                  )}
                  <ForgottenTimerDialog forgotten={page.forgottenTimer} projectName={runningName} />
                </>
              );
            }}
          </QueryView>
        </div>
      </div>
    </Page>
  );
}
