import type { Project, UpdateProject } from '@dreck/shared/api/projects';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import type { Catalog } from '@/catalog/useCatalog';
import { formatAmountInput, parseAmount } from '@/format/money';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import type { RateAnswer, RateQuestion } from './rate-change/useRateChange';

type ProjectFormOptions = {
  catalog: Catalog;
  /** The Project to edit; a new one without. */
  project?: Project;
  /** Preselected Customer of a new Project (`?customerId=`). */
  customerId?: number;
};

type Command = 'save' | 'archive' | 'restore' | 'delete';

export type ProjectForm = {
  customerId: string;
  name: string;
  rate: string;
  submit: Submit<Command>;
  /** Open while the user decides about existing Time Entries. */
  rateQuestion: RateQuestion | null;
  rateSubmit: Submit<RateAnswer>;
  handleCustomerChange: (value: string) => void;
  handleNameChange: (value: string) => void;
  handleRateChange: (value: string) => void;
  handleCancelRateQuestion: () => void;
};

/** Form state for a new or edited Project, including the question about the Hourly Rate. */
export function useProjectForm({ catalog, project, customerId }: ProjectFormOptions): ProjectForm {
  const { messages, language } = useI18n();
  const { currency } = useSettings();
  const navigate = useNavigate();
  const rateText = (minor: number): string => formatAmountInput(minor, currency, language);
  const initialCustomer = catalog.customers.find(
    (c) => c.id === (project?.customerId ?? customerId),
  );

  const [customer, setCustomer] = useState(initialCustomer ? String(initialCustomer.id) : '');
  const [name, setName] = useState(project?.name ?? '');
  const [rate, setRate] = useState(() => {
    const minor = project?.hourlyRateMinor ?? initialCustomer?.hourlyRateMinor;
    return minor === undefined ? '' : rateText(minor);
  });
  const [rateQuestion, setRateQuestion] = useState<RateQuestion | null>(null);

  function body(): UpdateProject {
    const changes: UpdateProject = {};
    const rateMinor = parseAmount(rate, currency) ?? 0;
    if (Number(customer) !== project?.customerId) changes.customerId = Number(customer);
    if (name.trim() !== project?.name) changes.name = name.trim();
    if (rateMinor !== project?.hourlyRateMinor) changes.hourlyRateMinor = rateMinor;
    return changes;
  }

  function validate(command: Command): Record<string, string> {
    if (command !== 'save') return {};
    const errors: Record<string, string> = {};
    if (customer === '') errors.customerId = messages.projects.form.errors.customerRequired;
    if (name.trim() === '') errors.name = messages.projects.form.errors.nameRequired;
    if (parseAmount(rate, currency) === null)
      errors.hourlyRateMinor = messages.expenses.errors.amount;
    return errors;
  }

  const submit = useSubmit(
    async (command: Command) => {
      if (!project) {
        const created = await api.post<Project>('/projects', body());
        navigate(`/projects/${created.id}`);
        return;
      }
      if (command === 'delete') {
        await api.delete(`/projects/${project.id}`);
        navigate('/projects');
        return;
      }
      if (command !== 'save') {
        await api.patch(`/projects/${project.id}`, { archived: command === 'archive' });
        return;
      }
      const changes = body();
      if (changes.hourlyRateMinor !== undefined) {
        const entries = await api.get<TimeEntry[]>('/time-entries', { projectId: project.id });
        if (entries.length > 0) {
          setRateQuestion({ entries, newRateMinor: changes.hourlyRateMinor });
          return;
        }
      }
      if (Object.keys(changes).length > 0) await api.patch(`/projects/${project.id}`, changes);
      navigate(`/projects/${project.id}`);
    },
    { validate, fields: { name_taken: 'name' } },
  );

  const rateSubmit = useSubmit(
    async ({ choice, timeEntries }: RateAnswer) => {
      if (!project) return;
      const { from, to, includeOverridden } = choice;
      const applyToTimeEntries = timeEntries ? { from, to, includeOverridden } : undefined;
      await api.patch(`/projects/${project.id}`, { ...body(), applyToTimeEntries });
      navigate(`/projects/${project.id}`);
    },
    { fields: { name_taken: 'name' } },
  );

  return {
    customerId: customer,
    name,
    rate,
    submit,
    rateQuestion,
    rateSubmit,
    handleCustomerChange: (value) => {
      setCustomer(value);
      // A new Project copies the rate of its Customer
      const chosen = catalog.customers.find((c) => String(c.id) === value);
      if (!project && chosen) setRate(rateText(chosen.hourlyRateMinor));
    },
    handleNameChange: setName,
    handleRateChange: setRate,
    handleCancelRateQuestion: () => setRateQuestion(null),
  };
}
