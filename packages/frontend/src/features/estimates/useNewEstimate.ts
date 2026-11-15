import type { Estimate } from '@dreck/shared/api/estimates';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import type { Catalog } from '@/catalog/useCatalog';
import { useToday } from '@/clock/useNow';
import { addDays } from '@/format/calendar';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';

export type NewEstimate = {
  customerId: string;
  /** Customers that can get a new Estimate: not Archived. */
  customers: Catalog['customers'];
  submit: Submit<null>;
  handleCustomerChange: (value: string) => void;
};

/** Days an Estimate is valid when created; changeable in the form afterwards. */
const VALID_DAYS = 30;

/** State of "Neues Angebot": the Customer; creates the draft and opens it for editing. */
export function useNewEstimate(catalog: Catalog): NewEstimate {
  const { messages } = useI18n();
  const today = useToday();
  const navigate = useNavigate();
  const customers = catalog.customers.filter((c) => !c.archived);
  const [customerId, setCustomerId] = useState(String(customers[0]?.id ?? ''));

  const submit = useSubmit(
    async () => {
      const created = await api.post<Estimate>('/estimates', {
        customerId: Number(customerId),
        issueDate: today,
        validUntil: addDays(today, VALID_DAYS),
      });
      navigate(`/estimates/${created.id}/edit`);
    },
    {
      validate: (): Record<string, string> =>
        customerId === '' ? { customerId: messages.estimates.form.errors.required } : {},
    },
  );

  return { customerId, customers, submit, handleCustomerChange: setCustomerId };
}
