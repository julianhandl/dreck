import type { Customer, UpdateCustomer } from '@dreck/shared/api/customers';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import type { Catalog } from '@/catalog/useCatalog';
import { formatAmountInput, parseAmount } from '@/format/money';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { followsProjectRate } from '@/tasks/task-rows';
import type { RateAnswer, RateQuestion } from './rate-change/useRateChange';

type Command = 'save' | 'archive' | 'restore' | 'delete';

export type CustomerForm = {
  name: string;
  rate: string;
  address: string;
  submit: Submit<Command>;
  /** Open while the user decides which Projects and Time Entries take over the rate. */
  rateQuestion: RateQuestion | null;
  rateSubmit: Submit<RateAnswer>;
  handleNameChange: (value: string) => void;
  handleRateChange: (value: string) => void;
  handleAddressChange: (value: string) => void;
  handleCancelRateQuestion: () => void;
};

/** Form state for a new or edited Customer, including the question about the Hourly Rate. */
export function useCustomerForm(catalog: Catalog, customer?: Customer): CustomerForm {
  const { messages, language } = useI18n();
  const settings = useSettings();
  const { currency } = settings;
  const navigate = useNavigate();
  const [name, setName] = useState(customer?.name ?? '');
  const [rate, setRate] = useState(() =>
    formatAmountInput(
      customer?.hourlyRateMinor ?? settings.defaultHourlyRateMinor,
      currency,
      language,
    ),
  );
  const [address, setAddress] = useState(customer?.address ?? '');
  const [rateQuestion, setRateQuestion] = useState<RateQuestion | null>(null);

  function body(): UpdateCustomer {
    const changes: UpdateCustomer = {};
    const rateMinor = parseAmount(rate, currency) ?? 0;
    if (name.trim() !== customer?.name) changes.name = name.trim();
    if (address.trim() !== (customer?.address ?? '')) changes.address = address.trim() || null;
    if (rateMinor !== customer?.hourlyRateMinor) changes.hourlyRateMinor = rateMinor;
    return changes;
  }

  function validate(command: Command): Record<string, string> {
    if (command !== 'save') return {};
    const errors: Record<string, string> = {};
    if (name.trim() === '') errors.name = messages.projects.form.errors.nameRequired;
    if (parseAmount(rate, currency) === null)
      errors.hourlyRateMinor = messages.expenses.errors.amount;
    return errors;
  }

  const submit = useSubmit(
    async (command: Command) => {
      if (!customer) {
        const created = await api.post<Customer>('/customers', body());
        navigate(`/projects/new?customerId=${created.id}`);
        return;
      }
      if (command === 'delete') {
        await api.delete(`/customers/${customer.id}`);
        navigate('/projects');
        return;
      }
      if (command !== 'save') {
        await api.patch(`/customers/${customer.id}`, { archived: command === 'archive' });
        return;
      }
      const changes = body();
      const projects = catalog.projects.filter((p) => p.customerId === customer.id && !p.archived);
      if (changes.hourlyRateMinor !== undefined && projects.length > 0) {
        const all = await api.get<TimeEntry[]>('/time-entries', { customerId: customer.id });
        const tasks = projects.flatMap((p) => p.tasks);
        setRateQuestion({
          // Tasks with an own rate keep it, so do their Time Entries
          entries: all.filter((e) => followsProjectRate(e, tasks)),
          newRateMinor: changes.hourlyRateMinor,
          projects: projects.map((project) => ({
            project,
            preselected: project.hourlyRateMinor === customer.hourlyRateMinor,
          })),
        });
        return;
      }
      if (Object.keys(changes).length > 0) await api.patch(`/customers/${customer.id}`, changes);
      navigate('/projects');
    },
    { validate, fields: { name_taken: 'name' } },
  );

  // The chosen Projects take over the rate either way; "Nur für neue" keeps their Time Entries
  const rateSubmit = useSubmit(async ({ choice, timeEntries }: RateAnswer) => {
    if (!customer) return;
    const { projectIds, from, to, includeOverridden } = choice;
    const applyToProjects =
      projectIds.length > 0
        ? {
            projectIds,
            applyToTimeEntries: timeEntries ? { from, to, includeOverridden } : undefined,
          }
        : undefined;
    await api.patch(`/customers/${customer.id}`, { ...body(), applyToProjects });
    navigate('/projects');
  });

  return {
    name,
    rate,
    address,
    submit,
    rateQuestion,
    rateSubmit,
    handleNameChange: setName,
    handleRateChange: setRate,
    handleAddressChange: setAddress,
    handleCancelRateQuestion: () => setRateQuestion(null),
  };
}
