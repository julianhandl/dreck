import { Form } from '@base-ui/react/form';
import type { Invoice } from '@dreck/shared/api/invoices';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { ItemsEditor } from '@/features/documents/ItemsEditor';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Page';
import { BackLink } from './BackLink';
import { InvoicePage } from './InvoicePage';
import { useInvoiceForm } from './useInvoiceForm';

/** Quick choices for the due date, in days after the issue date. */
const DUE_IN = [0, 14, 30] as const;

/**
 * "Invoice bearbeiten" like the Harvest form: number, recipient, dates, service period,
 * subject, tax and discount, the items with live amounts and totals, and the notes.
 * @example <Route path="invoices/:invoiceId/edit" element={<InvoiceFormPage />} />
 */
export function InvoiceFormPage(): ReactElement {
  return (
    <InvoicePage>
      {(invoice, invoices) => <InvoiceFormContent invoice={invoice} invoices={invoices} />}
    </InvoicePage>
  );
}

type InvoiceFormContentProps = {
  /** The Invoice to edit. */
  invoice: Invoice;
  /** All Invoices, for "Zuletzt verwendet". */
  invoices: Invoice[];
};

function InvoiceFormContent({ invoice, invoices }: InvoiceFormContentProps): ReactElement {
  const { messages } = useI18n();
  const form = useInvoiceForm(invoice);
  const { submit, values } = form;
  const t = messages.invoices.form;
  // The API lists newest issue date first; "last used" is the latest other number by id
  const lastUsed = invoices
    .filter((i) => i.id !== invoice.id)
    .reduce<Invoice | undefined>((last, i) => (last && last.id > i.id ? last : i), undefined);

  if (invoice.status !== 'draft') {
    return (
      <>
        <BackLink />
        <p role="alert">{messages.invoices.detail.locked}</p>
      </>
    );
  }

  return (
    <>
      <BackLink />
      <PageTitle>{t.title(invoice.number)}</PageTitle>
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
                name="dueDate"
                label={t.dueDate}
                type="date"
                required
                value={values.dueDate}
                onValueChange={form.handleChange('dueDate')}
              />
            </div>
            <div className="-mt-2 flex flex-wrap gap-2">
              {DUE_IN.map((days) => (
                <Button key={days} size="sm" onClick={() => form.handleDueIn(days)}>
                  {days === 0 ? t.uponReceipt : t.dueIn(days)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              <TextField
                name="periodFrom"
                label={t.periodFrom}
                type="date"
                value={values.periodFrom}
                onValueChange={form.handleChange('periodFrom')}
              />
              <TextField
                name="periodTo"
                label={t.periodTo}
                type="date"
                value={values.periodTo}
                onValueChange={form.handleChange('periodTo')}
              />
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

        <ItemsEditor rows={form.rows} removeHint={t.removeHint} />

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
          <Button as={Link} to={`/invoices/${invoice.id}`}>
            {messages.common.cancel}
          </Button>
        </div>
      </Form>
    </>
  );
}
