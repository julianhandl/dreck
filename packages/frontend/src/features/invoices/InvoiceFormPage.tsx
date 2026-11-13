import { Form } from '@base-ui/react/form';
import type { Invoice } from '@dreck/shared/api/invoices';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { formatPercent } from '@/format/decimal';
import { currencySymbol, formatMoney } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { PlusIcon, XIcon } from '@/ui/icons';
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
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const form = useInvoiceForm(invoice);
  const { submit, values } = form;
  const t = messages.invoices.form;
  const money = (minor: number): string => formatMoney(minor, currency, language);
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

        <section
          aria-labelledby="invoice-items"
          className="flex flex-col rounded-temp-card bg-temp-surface shadow-temp-card"
        >
          <h2 id="invoice-items" className="sr-only">
            {t.items}
          </h2>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[2.75rem_1fr_7rem_9rem_8rem] gap-4 border-temp-divider border-b px-4 py-3 text-temp-ink-muted md:grid"
          >
            <span />
            <span>{t.description}</span>
            <span className="text-right">{t.quantity}</span>
            <span className="text-right">{t.unitPrice}</span>
            <span className="text-right">{t.amount}</span>
          </div>
          <ol>
            {form.items.map((item, index) => (
              <li
                key={item.key}
                className="grid grid-cols-[2.75rem_1fr] items-start gap-4 border-temp-divider border-b p-4 md:grid-cols-[2.75rem_1fr_7rem_9rem_8rem]"
              >
                <Button
                  size="icon"
                  aria-label={t.removeItem(index + 1)}
                  onClick={() => form.handleRemoveItem(item.key)}
                >
                  <XIcon />
                </Button>
                <TextField
                  name={`item-${item.key}-description`}
                  label={t.descriptionFor(index + 1)}
                  hideLabel
                  multiline
                  value={item.description}
                  onValueChange={(v) => form.handleItemChange(item.key, 'description', v)}
                  inputClassName="field-sizing-content min-h-11"
                />
                <div className="col-start-2 grid grid-cols-3 items-start gap-4 md:col-span-3 md:col-start-3 md:grid-cols-[7rem_9rem_8rem]">
                  <TextField
                    name={`item-${item.key}-quantity`}
                    label={t.quantityFor(index + 1)}
                    hideLabel
                    inputMode="decimal"
                    autoComplete="off"
                    value={item.quantity}
                    onValueChange={(v) => form.handleItemChange(item.key, 'quantity', v)}
                    inputClassName="text-right"
                  />
                  <TextField
                    name={`item-${item.key}-unitPrice`}
                    label={t.unitPriceFor(index + 1)}
                    hideLabel
                    inputMode="decimal"
                    autoComplete="off"
                    prefix={<span aria-hidden="true">{currencySymbol(currency, language)}</span>}
                    value={item.unitPrice}
                    onValueChange={(v) => form.handleItemChange(item.key, 'unitPrice', v)}
                    inputClassName="text-right"
                  />
                  <span className="pt-2.5 text-right font-semibold whitespace-nowrap">
                    {money(form.amounts.get(item.key) ?? 0)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-start justify-between gap-6 p-4">
            <div className="flex flex-col gap-2">
              <Button className="w-fit" onClick={form.handleAddItem}>
                <PlusIcon />
                {t.addItem}
              </Button>
              <p className="text-sm text-temp-ink-muted">{t.removeHint}</p>
            </div>
            <dl className="ml-auto grid grid-cols-[auto_auto] gap-x-8 gap-y-2 text-right">
              <dt>{messages.invoices.document.subtotal}</dt>
              <dd>{money(form.totals.subtotalMinor)}</dd>
              {form.discountBasisPoints > 0 && (
                <>
                  <dt>
                    {messages.invoices.document.discount(
                      formatPercent(form.discountBasisPoints, language),
                    )}
                  </dt>
                  <dd>−{money(form.totals.discountMinor)}</dd>
                </>
              )}
              {form.taxBasisPoints > 0 && (
                <>
                  <dt>
                    {messages.invoices.document.tax(formatPercent(form.taxBasisPoints, language))}
                  </dt>
                  <dd>{money(form.totals.taxMinor)}</dd>
                </>
              )}
              <dt className="font-semibold">{messages.invoices.document.total}</dt>
              <dd className="font-semibold">{money(form.totals.totalMinor)}</dd>
            </dl>
          </div>
        </section>

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
