import type { Project, UpdateProject } from '@dreck/shared/api/projects';
import type { TaskInput } from '@dreck/shared/api/tasks';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import type { Catalog } from '@/catalog/useCatalog';
import { formatAmountInput, parseAmount } from '@/format/money';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { newEntryRate, taskInputs, taskRowErrors, taskRows } from '@/tasks/task-rows';
import { type TaskList, useTaskList } from '@/tasks/useTaskList';
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
  /** Tasks of the Project; a new one starts with the Default Tasks. */
  tasks: TaskList;
  submit: Submit<Command>;
  /** Open while the user decides about existing Time Entries. */
  rateQuestion: RateQuestion | null;
  rateSubmit: Submit<RateAnswer>;
  handleCustomerChange: (value: string) => void;
  handleNameChange: (value: string) => void;
  handleRateChange: (value: string) => void;
  handleCancelRateQuestion: () => void;
};

/**
 * Form state for a new or edited Project with its Tasks, including the question whether
 * existing Time Entries take over changed Hourly Rates.
 */
export function useProjectForm({ catalog, project, customerId }: ProjectFormOptions): ProjectForm {
  const { messages, language } = useI18n();
  const { currency, defaultTasks } = useSettings();
  const navigate = useNavigate();
  const parseRate = (text: string): number | null => parseAmount(text, currency);
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
  const tasks = useTaskList(() => taskRows(project?.tasks ?? defaultTasks, rateText));

  function body(): UpdateProject {
    const changes: UpdateProject = {};
    const rateMinor = parseRate(rate) ?? 0;
    if (Number(customer) !== project?.customerId) changes.customerId = Number(customer);
    if (name.trim() !== project?.name) changes.name = name.trim();
    if (rateMinor !== project?.hourlyRateMinor) changes.hourlyRateMinor = rateMinor;
    const list = taskInputs(tasks.rows, parseRate);
    const unchanged =
      project && sameTasks(list, taskInputs(taskRows(project.tasks, rateText), parseRate));
    if (!unchanged) changes.tasks = list;
    return changes;
  }

  function validate(command: Command): Record<string, string> {
    if (command !== 'save') return {};
    const errors: Record<string, string> = {};
    if (customer === '') errors.customerId = messages.projects.form.errors.customerRequired;
    if (name.trim() === '') errors.name = messages.projects.form.errors.nameRequired;
    if (parseRate(rate) === null) errors.hourlyRateMinor = messages.expenses.errors.amount;
    const rowErrors = taskRowErrors(tasks.rows, parseRate, {
      ...messages.tasks.errors,
      rate: messages.expenses.errors.amount,
    });
    return { ...errors, ...rowErrors };
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
      if (changes.hourlyRateMinor !== undefined || changes.tasks !== undefined) {
        const question = await rateQuestionFor(project, changes);
        if (question) {
          setRateQuestion(question);
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

  // Only Time Entries whose rate source changed; a Task's own rate wins over the Project's
  async function rateQuestionFor(
    current: Project,
    changes: UpdateProject,
  ): Promise<RateQuestion | null> {
    const after = {
      hourlyRateMinor: changes.hourlyRateMinor ?? current.hourlyRateMinor,
      tasks: changes.tasks ?? current.tasks,
    };
    const rateOf = (entry: TimeEntry): number =>
      newEntryRate(entry, current, after) ?? entry.hourlyRateMinor;
    const all = await api.get<TimeEntry[]>('/time-entries', { projectId: current.id });
    const entries = all.filter((e) => newEntryRate(e, current, after) !== null);
    if (entries.length === 0) return null;
    const rates = new Set(entries.map(rateOf));
    const [single] = rates;
    return { entries, rateOf, newRateMinor: rates.size === 1 ? (single ?? null) : null };
  }

  return {
    customerId: customer,
    name,
    rate,
    tasks,
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

function sameTasks(a: TaskInput[], b: TaskInput[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
