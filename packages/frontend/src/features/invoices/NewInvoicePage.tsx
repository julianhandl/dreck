import { Form } from '@base-ui/react/form';
import { INVOICE_GROUPINGS } from '@dreck/shared/invoice-items';
import type { ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';
import { formatDuration } from '@/format/duration';
import { formatMoney } from '@/format/money';
import { CheckboxField } from '@/forms/CheckboxField';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { Page, PageTitle } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { Select } from '@/ui/Select';
import { BackLink } from './BackLink';
import { formatQuantity } from './invoice-display';
import {
  type InvoiceSource,
  type InvoiceStart,
  invoiceStart,
  useNewInvoice,
} from './useNewInvoice';

const NUM = 'px-4 py-3 text-right align-top whitespace-nowrap';

/**
 * "Neue Rechnung": Customer, and either an import of uninvoiced time and expenses for a range
 * (with a live preview of the items) or an empty Invoice. Creates a draft and opens it for
 * editing. `?projectId=` starts with that Project ("Verrechnen").
 * @example <Route path="invoices/new" element={<NewInvoicePage />} />
 */
export function NewInvoicePage(): ReactElement {
  const { messages } = useI18n();
  const projectId = Number(useSearchParams()[0].get('projectId')) || null;
  return (
    <Page>
      <BackLink />
      <PageTitle>{messages.invoices.create.title}</PageTitle>
      <QueryView state={useCatalog()}>
        {(catalog) => <NewInvoiceForm catalog={catalog} start={invoiceStart(catalog, projectId)} />}
      </QueryView>
    </Page>
  );
}

type NewInvoiceFormProps = {
  /** Customers and Projects to choose from. */
  catalog: Catalog;
  /** Initial Customer and Project. */
  start: InvoiceStart;
};

function NewInvoiceForm({ catalog, start }: NewInvoiceFormProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const form = useNewInvoice(catalog, start);
  const { submit } = form;
  const t = messages.invoices.create;
  const money = (minor: number): string => formatMoney(minor, currency, language);

  if (form.customers.length === 0) return <p>{t.noCustomers}</p>;

  return (
    <Form
      ref={submit.formRef}
      errors={submit.errors}
      onFormSubmit={() => submit.handleSubmit(null)}
      className="flex flex-col gap-6 border-temp-divider border-t pt-6"
    >
      <Select
        name="customerId"
        layout="row"
        label={t.customer}
        value={form.customerId}
        options={form.customers.map((c) => ({ value: String(c.id), label: c.name }))}
        onValueChange={form.handleCustomerChange}
      />
      <fieldset className="grid gap-x-8 gap-y-2 sm:grid-cols-[12rem_1fr]">
        <legend className="float-left font-medium sm:pt-2.5">{t.source}</legend>
        <div className="flex flex-col gap-1 sm:col-start-2">
          {(['import', 'empty'] as const satisfies InvoiceSource[]).map((source) => (
            <label key={source} className="flex min-h-11 w-fit items-center gap-3">
              <input
                type="radio"
                name="source"
                className="size-5"
                checked={form.source === source}
                onChange={() => form.handleSourceChange(source)}
              />
              {source === 'import' ? t.sourceImport : t.sourceEmpty}
            </label>
          ))}
        </div>
      </fieldset>
      {form.source === 'import' && (
        <>
          <Select
            name="projectId"
            layout="row"
            label={t.project}
            value={form.projectId}
            options={[
              { value: 'all', label: t.allProjects },
              ...form.projects.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            onValueChange={form.handleProjectChange}
          />
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-[12rem_1fr]">
            <div className="flex flex-wrap gap-4 sm:col-start-2">
              <TextField
                name="from"
                label={t.from}
                type="date"
                required
                value={form.from}
                onValueChange={form.handleFromChange}
              />
              <TextField
                name="to"
                label={t.to}
                type="date"
                required
                value={form.to}
                onValueChange={form.handleToChange}
              />
            </div>
          </div>
          <Select
            name="grouping"
            layout="row"
            label={t.grouping}
            value={form.grouping}
            options={INVOICE_GROUPINGS.map((g) => ({
              value: g,
              label: t.groupings[g],
              disabled: g === 'project' && form.projectId !== 'all',
            }))}
            onValueChange={form.handleGroupingChange}
          />
          <div className="sm:pl-56">
            <CheckboxField
              label={t.expenses}
              checked={form.withExpenses}
              onCheckedChange={form.handleWithExpensesChange}
            />
          </div>
          <section aria-labelledby="invoice-preview" className="flex flex-col gap-3">
            <h2 id="invoice-preview" className="font-semibold text-xl">
              {t.previewTitle}
            </h2>
            <QueryView state={form.preview}>
              {(p) =>
                p.items.length === 0 ? (
                  <p role="status" className="rounded-temp-card bg-temp-band p-4">
                    {t.nothing}
                  </p>
                ) : (
                  <>
                    <div role="status">
                      <p className="font-medium">
                        {t.preview(p.entries, formatDuration(p.seconds), money(p.timeMinor))}
                      </p>
                      {form.withExpenses && (
                        <p className="font-medium">
                          {t.previewExpenses(p.expenses, money(p.expensesMinor))}
                        </p>
                      )}
                    </div>
                    <div className="overflow-x-auto rounded-temp-card bg-temp-surface shadow-temp-card">
                      <table className="w-full border-collapse">
                        <thead className="border-temp-divider border-b text-temp-ink-muted">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left font-normal">
                              {messages.invoices.form.description}
                            </th>
                            <th scope="col" className={`${NUM} font-normal`}>
                              {messages.invoices.form.quantity}
                            </th>
                            <th scope="col" className={`${NUM} font-normal max-sm:hidden`}>
                              {messages.invoices.form.unitPrice}
                            </th>
                            <th scope="col" className={`${NUM} font-normal`}>
                              {messages.invoices.form.amount}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.items.map((item) => (
                            <tr key={item.key} className="border-temp-divider border-b">
                              <td className="px-4 py-3 align-top">{item.description}</td>
                              <td className={NUM}>
                                {formatQuantity(item.quantityHundredths, language)}
                              </td>
                              <td className={`${NUM} max-sm:hidden`}>
                                {money(item.unitPriceMinor)}
                              </td>
                              <td className={NUM}>{money(item.amountMinor)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-semibold">
                            <th scope="row" className="px-4 py-3 text-left">
                              {messages.invoices.document.subtotal}
                            </th>
                            <td className={NUM} />
                            <td className={`${NUM} max-sm:hidden`} />
                            <td className={NUM}>{money(p.subtotalMinor)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="text-sm text-temp-ink-muted">{t.lockHint}</p>
                  </>
                )
              }
            </QueryView>
          </section>
        </>
      )}
      <FormStatus submit={submit} />
      <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-6">
        <Button variant="primary" type="submit" aria-disabled={submit.pending}>
          {t.submit}
        </Button>
        <Button as={Link} to="/invoices">
          {messages.common.cancel}
        </Button>
      </div>
    </Form>
  );
}
