import type { ReactElement } from 'react';
import { formatDuration } from '@/format/duration';
import { formatMoney } from '@/format/money';
import { CheckboxField } from '@/forms/CheckboxField';
import { FormStatus } from '@/forms/FormStatus';
import type { Submit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { type RateAnswer, type RateQuestion, useRateChange } from './useRateChange';

type RateChangeDialogProps = {
  question: RateQuestion;
  /** Saves with the choice; `timeEntries: false` = existing Time Entries keep their rate. */
  submit: Submit<RateAnswer>;
  /** Closes the question without saving. */
  onCancel: () => void;
};

/**
 * Question after a changed Hourly Rate: optional range, live preview old → new, Time Entries
 * corrected by hand separately, for a Customer the choice of Projects.
 * @example <RateChangeDialog question={question} submit={submit} onCancel={close} />
 */
export function RateChangeDialog({
  question,
  submit,
  onCancel,
}: RateChangeDialogProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const rate = useRateChange(question);
  const { summary } = rate;
  const t = messages.rateChange;
  const money = (minor: number): string => formatMoney(minor, currency, language);

  return (
    <Modal title={t.title} open onOpenChange={(open) => !open && onCancel()}>
      <div className="flex flex-col gap-5">
        <p>{t.intro(money(question.newRateMinor))}</p>
        {question.projects && (
          <fieldset className="flex flex-col">
            <legend className="mb-1 font-medium">{t.projects}</legend>
            {question.projects.map(({ project }) => (
              <CheckboxField
                key={project.id}
                label={`${project.name} (${money(project.hourlyRateMinor)})`}
                checked={rate.selected.has(project.id)}
                onCheckedChange={() => rate.handleToggleProject(project.id)}
              />
            ))}
          </fieldset>
        )}
        <fieldset className="flex flex-wrap items-end gap-3">
          <legend className="mb-1 font-medium">{t.range}</legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t.from}</span>
            <input
              type="date"
              value={rate.from}
              onChange={(event) => rate.handleFromChange(event.target.value)}
              className="min-h-11 rounded-temp-control border border-temp-border bg-temp-surface px-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t.to}</span>
            <input
              type="date"
              value={rate.to}
              onChange={(event) => rate.handleToChange(event.target.value)}
              className="min-h-11 rounded-temp-control border border-temp-border bg-temp-surface px-3"
            />
          </label>
        </fieldset>
        <p role="status" className="rounded-temp-card bg-temp-band p-4">
          {t.summary(summary.count, formatDuration(summary.seconds))}
          <br />
          <span className="font-semibold">
            {money(summary.oldMinor)} → {money(summary.newMinor)}
          </span>
        </p>
        {summary.overriddenCount > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1">
              {rate.includeOverridden
                ? t.overriddenIncluded(summary.overriddenCount)
                : t.overriddenKept(summary.overriddenCount)}
            </p>
            <Button
              size="sm"
              aria-pressed={rate.includeOverridden}
              onClick={rate.handleToggleOverridden}
            >
              {t.overwrite}
            </Button>
          </div>
        )}
        <FormStatus submit={submit} />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            aria-disabled={submit.pending}
            onClick={() => submit.handleSubmit({ choice: rate.choice, timeEntries: true })}
          >
            {t.apply}
          </Button>
          <Button
            aria-disabled={submit.pending}
            onClick={() => submit.handleSubmit({ choice: rate.choice, timeEntries: false })}
          >
            {t.onlyNew}
          </Button>
          <Button variant="link" onClick={onCancel}>
            {messages.common.cancel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
