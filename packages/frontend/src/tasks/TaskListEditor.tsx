import type { ReactElement } from 'react';
import { currencySymbol } from '@/format/money';
import { CheckboxField } from '@/forms/CheckboxField';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { taskFieldName } from './task-rows';
import type { TaskList } from './useTaskList';

type TaskListEditorProps = {
  /** Rows and handlers from `useTaskList`. */
  list: TaskList;
  /** Shows the field for an own Hourly Rate on billable Tasks (Projects, not Default Tasks). */
  withRates?: boolean;
  /** Server error for the whole list, e.g. a name that is taken. */
  error?: string;
};

/**
 * Editable list of Tasks inside a Base UI `Form`: name, Billable, optionally an own Hourly
 * Rate; remove, restore Archived ones, add a row.
 * @example <TaskListEditor list={form.tasks} withRates error={submit.errors.tasks} />
 */
export function TaskListEditor({
  list,
  withRates = false,
  error,
}: TaskListEditorProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const t = messages.tasks;

  return (
    <div className="flex flex-col gap-3">
      {list.rows.length === 0 && <p className="text-temp-ink-muted">{t.empty}</p>}
      <ul className="flex flex-col">
        {list.rows.map((row, index) => (
          <li
            key={row.key}
            className="flex flex-wrap items-end gap-x-4 gap-y-2 border-temp-divider border-b py-3 first:pt-0"
          >
            <div className="min-w-48 flex-1">
              <TextField
                name={taskFieldName(row.key, 'name')}
                label={t.label(index + 1)}
                autoComplete="off"
                value={row.name}
                onValueChange={(name) => list.handleChange(row.key, { name })}
              />
            </div>
            <CheckboxField
              label={t.billable}
              checked={row.billable}
              onCheckedChange={(billable) => list.handleChange(row.key, { billable })}
            />
            {/* Keeps the columns aligned on wide screens when the rate field is missing */}
            {withRates && !row.billable && (
              <div aria-hidden="true" className="hidden w-64 sm:block" />
            )}
            {withRates && row.billable && (
              <div className="w-64">
                <TextField
                  name={taskFieldName(row.key, 'rate')}
                  label={t.ownRate}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={t.ownRatePlaceholder}
                  prefix={<span>{currencySymbol(currency, language)}</span>}
                  suffix={<span className="whitespace-nowrap">{messages.common.perHour}</span>}
                  value={row.rate}
                  onValueChange={(rate) => list.handleChange(row.key, { rate })}
                />
              </div>
            )}
            <div className="flex min-h-11 items-center gap-3">
              {row.archived ? (
                <>
                  <Pill>{messages.common.archived}</Pill>
                  <Button size="sm" onClick={() => list.handleChange(row.key, { archived: false })}>
                    {messages.common.restore}
                  </Button>
                </>
              ) : (
                <Button
                  variant="danger"
                  aria-label={row.name.trim() ? t.removeNamed(row.name.trim()) : undefined}
                  onClick={() => list.handleRemove(row.key)}
                >
                  {t.remove}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-temp-danger">
          {error}
        </p>
      )}
      <Button id={list.addId} onClick={list.handleAdd} className="self-start">
        {t.add}
      </Button>
    </div>
  );
}
