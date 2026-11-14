import { Form } from '@base-ui/react/form';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { type ReactElement, useId } from 'react';
import { ProjectPicker } from '@/catalog/ProjectPicker';
import type { Catalog } from '@/catalog/useCatalog';
import { formatDate } from '@/format/date';
import { currencySymbol } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Select } from '@/ui/Select';
import type { NewTimer } from './forgotten/useForgottenTimer';
import { useTimeEntryDialog } from './useTimeEntryDialog';

type TimeEntryDialogProps = {
  catalog: Catalog;
  /** Time Entries of the loaded week. */
  entries: TimeEntry[];
  /** The running Time Entry, also from an earlier week. */
  running: TimeEntry | null;
  /** The running timer was forgotten: starting hands over to "Wann hast du aufgehört?". */
  forgotten: boolean;
  /** Receives a new timer while the running one was forgotten. */
  onStartForgotten: (start: NewTimer) => void;
  /** The entry to edit; a new one without. */
  entry?: TimeEntry;
  /** Day of a new entry. */
  date: string;
  today: string;
  now: number;
  /** Closes the dialog (Escape, Abbrechen, after saving). */
  onClose: () => void;
};

/**
 * Dialog "Neuer Time Entry" / "Time Entry bearbeiten": Project, Task (if the Project has
 * some), notes, duration, date; when editing also the Hourly Rate, folded away; it follows a
 * new Project or Task until corrected by hand.
 * Today without a duration the main button starts the timer; Enter triggers it from every
 * field. Focus starts on the Project when new, on the duration when editing.
 * @example <TimeEntryDialog catalog={catalog} entries={entries} date={date} today={today} now={now} onClose={close} />
 */
export function TimeEntryDialog(props: TimeEntryDialogProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const dialog = useTimeEntryDialog(props);
  const { submit } = dialog;
  const suggestionsId = useId();
  const t = messages.time.dialog;
  const day = formatDate(props.date, language, { weekday: 'long', day: 'numeric', month: 'short' });
  const title = props.entry ? t.editTitle : t.newTitle(day);

  let mainLabel = t.save;
  if (props.entry) mainLabel = t.update;
  else if (dialog.startsTimer) mainLabel = t.startTimer;

  return (
    <Modal
      title={title}
      open
      onOpenChange={(open) => !open && props.onClose()}
      initialFocus={dialog.initialFocus}
      finalFocus={dialog.finalFocus}
    >
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit('save')}
        onKeyDownCapture={dialog.handleKeyDownCapture}
        className="flex flex-col gap-4"
      >
        <ProjectPicker
          name="projectId"
          label={t.project}
          catalog={props.catalog}
          usedToday={dialog.usedToday}
          value={dialog.projectId}
          onValueChange={dialog.handleProjectChange}
        />
        {dialog.taskOptions.length > 0 && (
          <Select
            name="taskId"
            label={t.task}
            value={dialog.task}
            options={dialog.taskOptions}
            onValueChange={dialog.handleTaskChange}
            className="w-full"
          />
        )}
        <TextField
          name="description"
          label={t.description}
          hideLabel
          placeholder={t.description}
          list={suggestionsId}
          value={dialog.description}
          onValueChange={dialog.handleDescriptionChange}
        />
        <datalist id={suggestionsId}>
          {dialog.suggestions.map((text) => (
            <option key={text} value={text} />
          ))}
        </datalist>
        {/* Tab order Dauer → Datum, shown as Datum left, Dauer right */}
        <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-[auto_1fr_10rem]">
          <div className="col-start-2 row-start-1 sm:col-start-3">
            <TextField
              ref={dialog.durationRef}
              name="duration"
              label={t.duration}
              placeholder="0:00"
              inputMode="decimal"
              autoComplete="off"
              value={dialog.duration}
              onValueChange={dialog.handleDurationChange}
              inputClassName="text-right text-2xl"
            />
          </div>
          <div className="col-start-1 row-start-1 min-w-0">
            <TextField
              name="date"
              label={t.date}
              type="date"
              required
              value={dialog.date}
              onValueChange={dialog.handleDateChange}
            />
          </div>
        </div>
        {props.entry && (
          // Rarely needed: folded away, open while it has an error so the focus can reach it
          <details
            open={dialog.rateOpen || 'hourlyRateMinor' in submit.errors}
            onToggle={(event) => dialog.handleRateToggle(event.currentTarget.open)}
          >
            <summary className="cursor-pointer text-temp-ink-muted">
              {t.rate}: {currencySymbol(currency, language)} {dialog.rate} {messages.common.perHour}
              {props.entry.hourlyRateOverridden && ` · ${t.rateOverriddenShort}`}
            </summary>
            <div className="pt-3">
              <TextField
                name="hourlyRateMinor"
                label={t.rate}
                description={props.entry.hourlyRateOverridden ? t.rateOverridden : t.rateHint}
                inputMode="decimal"
                autoComplete="off"
                prefix={<span>{currencySymbol(currency, language)}</span>}
                suffix={<span className="whitespace-nowrap">{messages.common.perHour}</span>}
                value={dialog.rate}
                onValueChange={dialog.handleRateChange}
                inputClassName="max-w-40"
              />
            </div>
          </details>
        )}
        <p role="status" className="text-temp-ink-muted empty:sr-only">
          {dialog.stopsHint}
        </p>
        <FormStatus submit={submit} />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            type="submit"
            aria-disabled={submit.pending}
            className="max-sm:w-full"
          >
            {mainLabel}
          </Button>
          <Button onClick={props.onClose}>{messages.common.cancel}</Button>
          {props.entry && (
            <Button
              variant="danger"
              className="ml-auto"
              aria-disabled={submit.pending}
              onClick={() => submit.handleSubmit('delete')}
            >
              {messages.common.delete}
            </Button>
          )}
        </div>
      </Form>
    </Modal>
  );
}
