import { Form } from '@base-ui/react/form';
import type { Estimate } from '@dreck/shared/api/estimates';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { ItemsEditor } from '@/features/documents/ItemsEditor';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Page';
import { BackLink } from './BackLink';
import { EstimatePage } from './EstimatePage';
import { useEstimateForm } from './useEstimateForm';

/** Quick choices for "Gültig bis", in days after the estimate date. */
const VALID_IN = [14, 30] as const;

/**
 * "Angebot bearbeiten": number, recipient, dates, subject, tax and discount, the items with
 * live amounts and totals, and the notes.
 * @example <Route path="estimates/:estimateId/edit" element={<EstimateFormPage />} />
 */
export function EstimateFormPage(): ReactElement {
  return (
    <EstimatePage>
      {(estimate, estimates) => <EstimateFormContent estimate={estimate} estimates={estimates} />}
    </EstimatePage>
  );
}

type EstimateFormContentProps = {
  /** The Estimate to edit. */
  estimate: Estimate;
  /** All Estimates, for "Zuletzt verwendet". */
  estimates: Estimate[];
};

function EstimateFormContent({ estimate, estimates }: EstimateFormContentProps): ReactElement {
  const { messages } = useI18n();
  const form = useEstimateForm(estimate);
  const { submit, values } = form;
  const t = messages.estimates.form;
  // "Last used" is the latest other number by id
  const lastUsed = estimates
    .filter((e) => e.id !== estimate.id)
    .reduce<Estimate | undefined>((last, e) => (last && last.id > e.id ? last : e), undefined);

  if (estimate.status !== 'draft') {
    return (
      <>
        <BackLink />
        <p role="alert">{messages.estimates.detail.locked}</p>
      </>
    );
  }

  return (
    <>
      <BackLink />
      <PageTitle>{t.title(estimate.number)}</PageTitle>
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit(null)}
        className="flex flex-col gap-6 border-temp-divider border-t pt-6"
      >
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-12">
          <div className="flex flex-col gap-4">
            <TextField
              name="number"
              label={t.number}
              required
              autoComplete="off"
              description={lastUsed && t.lastUsed(lastUsed.number)}
              value={values.number}
              onValueChange={form.handleChange('number')}
              inputClassName="max-w-60"
            />
            <div className="flex flex-wrap gap-4">
              <TextField
                name="issueDate"
                label={t.issueDate}
                type="date"
                required
                value={values.issueDate}
                onValueChange={form.handleChange('issueDate')}
              />
              <TextField
                name="validUntil"
                label={t.validUntil}
                type="date"
                value={values.validUntil}
                onValueChange={form.handleChange('validUntil')}
              />
            </div>
            <div className="-mt-2 flex flex-wrap gap-2">
              {VALID_IN.map((days) => (
                <Button key={days} size="sm" onClick={() => form.handleValidIn(days)}>
                  {t.validIn(days)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <TextField
              name="recipient"
              label={t.recipient}
              description={t.recipientHint}
              multiline
              required
              value={values.recipient}
              onValueChange={form.handleChange('recipient')}
              inputClassName="field-sizing-content min-h-24"
            />
            <div className="flex flex-wrap gap-4">
              <TextField
                name="tax"
                label={t.tax}
                inputMode="decimal"
                autoComplete="off"
                suffix={<span>%</span>}
                value={values.tax}
                onValueChange={form.handleChange('tax')}
                inputClassName="max-w-24"
              />
              <TextField
                name="discount"
                label={t.discount}
                inputMode="decimal"
                autoComplete="off"
                suffix={<span>%</span>}
                value={values.discount}
                onValueChange={form.handleChange('discount')}
                inputClassName="max-w-24"
              />
            </div>
          </div>
        </div>
        <TextField
          name="subject"
          label={t.subject}
          autoComplete="off"
          value={values.subject}
          onValueChange={form.handleChange('subject')}
        />

        <ItemsEditor rows={form.rows} />

        <TextField
          name="notes"
          label={t.notes}
          multiline
          value={values.notes}
          onValueChange={form.handleChange('notes')}
        />
        <FormStatus submit={submit} />
        <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-6">
          <Button variant="primary" type="submit" aria-disabled={submit.pending}>
            {t.save}
          </Button>
          <Button as={Link} to={`/estimates/${estimate.id}`}>
            {messages.common.cancel}
          </Button>
        </div>
      </Form>
    </>
  );
}
