import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';
import { FormStatus } from '@/forms/FormStatus';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { Page, PageTitle } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { Select } from '@/ui/Select';
import { BackLink } from './BackLink';
import { useNewEstimate } from './useNewEstimate';

/**
 * "Neues Angebot": choose the Customer, create a draft and open it for editing.
 * @example <Route path="estimates/new" element={<NewEstimatePage />} />
 */
export function NewEstimatePage(): ReactElement {
  const { messages } = useI18n();
  return (
    <Page>
      <BackLink />
      <PageTitle>{messages.estimates.create.title}</PageTitle>
      <QueryView state={useCatalog()}>
        {(catalog) => <NewEstimateForm catalog={catalog} />}
      </QueryView>
    </Page>
  );
}

type NewEstimateFormProps = {
  /** Customers to choose from. */
  catalog: Catalog;
};

function NewEstimateForm({ catalog }: NewEstimateFormProps): ReactElement {
  const { messages } = useI18n();
  const form = useNewEstimate(catalog);
  const { submit } = form;
  const t = messages.estimates.create;

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
      <FormStatus submit={submit} />
      <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-6">
        <Button variant="primary" type="submit" aria-disabled={submit.pending}>
          {t.submit}
        </Button>
        <Button as={Link} to="/estimates">
          {messages.common.cancel}
        </Button>
      </div>
    </Form>
  );
}
