import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import type { Catalog } from '@/catalog/useCatalog';
import { currencySymbol } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { Page, PageTitle } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { RateChangeDialog } from './rate-change/RateChangeDialog';
import { useCustomerForm } from './useCustomerForm';
import { useProjectRoute } from './useProjectRoute';

/**
 * "Neuer Customer" / "Customer bearbeiten": name and Hourly Rate, for an existing Customer
 * also archive and delete.
 * @example <Route path="projects/customers/:customerId/edit" element={<CustomerFormPage />} />
 */
export function CustomerFormPage(): ReactElement {
  const route = useProjectRoute();
  return (
    <Page>
      <QueryView state={route.catalog}>
        {(catalog) => <CustomerFormContent catalog={catalog} customerId={route.customerId} />}
      </QueryView>
    </Page>
  );
}

type CustomerFormContentProps = {
  catalog: Catalog;
  /** Customer to edit; `undefined` for a new one. */
  customerId?: number;
};

function CustomerFormContent({ catalog, customerId }: CustomerFormContentProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const customer = catalog.customers.find((c) => c.id === customerId);
  const form = useCustomerForm(catalog, customer);
  const { submit } = form;
  const t = messages.customers;

  if (customerId !== undefined && !customer) return <p>{messages.errors.not_found}</p>;

  return (
    <>
      <PageTitle>{customer ? t.editTitle : t.newTitle}</PageTitle>
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit('save')}
        className="flex flex-col gap-6 border-temp-divider border-t pt-6"
      >
        <TextField
          name="name"
          layout="row"
          label={t.name}
          autoComplete="organization"
          required
          value={form.name}
          onValueChange={form.handleNameChange}
        />
        <TextField
          name="hourlyRateMinor"
          layout="row"
          label={t.rate}
          description={t.rateHint}
          inputMode="decimal"
          autoComplete="off"
          prefix={<span>{currencySymbol(currency, language)}</span>}
          suffix={<span className="whitespace-nowrap">{messages.common.perHour}</span>}
          value={form.rate}
          onValueChange={form.handleRateChange}
          inputClassName="max-w-40"
        />
        <TextField
          name="address"
          layout="row"
          label={t.address}
          description={t.addressHint}
          multiline
          autoComplete="off"
          value={form.address}
          onValueChange={form.handleAddressChange}
          inputClassName="max-w-md"
        />
        <FormStatus submit={submit} />
        <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-6">
          <Button variant="primary" type="submit" aria-disabled={submit.pending}>
            {customer ? t.update : t.create}
          </Button>
          <Button as={Link} to="/projects">
            {messages.common.cancel}
          </Button>
          {customer && (
            <div className="ml-auto flex gap-3">
              <Button
                aria-disabled={submit.pending}
                onClick={() => submit.handleSubmit(customer.archived ? 'restore' : 'archive')}
              >
                {customer.archived ? messages.common.restore : messages.common.archive}
              </Button>
              <Button
                variant="danger"
                aria-disabled={submit.pending}
                onClick={() => submit.handleSubmit('delete')}
              >
                {messages.common.delete}
              </Button>
            </div>
          )}
        </div>
      </Form>
      {form.rateQuestion && (
        <RateChangeDialog
          question={form.rateQuestion}
          submit={form.rateSubmit}
          onCancel={form.handleCancelRateQuestion}
        />
      )}
    </>
  );
}
