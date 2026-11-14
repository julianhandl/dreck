import { useState } from 'react';
import { api } from '@/api/api-client';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { taskInputs, taskRowErrors, taskRows } from '@/tasks/task-rows';
import { type TaskList, useTaskList } from '@/tasks/useTaskList';

export type DefaultTasksPage = {
  tasks: TaskList;
  saved: boolean;
  submit: Submit<null>;
};

// Default Tasks have no rate; the text is never parsed
const noRate = (): null => null;

/** Form state of the Default Tasks in the settings. */
export function useDefaultTasksPage(): DefaultTasksPage {
  const settings = useSettings();
  const { messages } = useI18n();
  const [saved, setSaved] = useState(false);
  const tasks = useTaskList(
    () => taskRows(settings.defaultTasks, String),
    () => setSaved(false),
  );

  const submit = useSubmit(
    async () => {
      const defaultTasks = taskInputs(tasks.rows, noRate).map(({ name, billable }) => ({
        name,
        billable,
      }));
      await api.patch('/settings', { defaultTasks });
      setSaved(true);
    },
    {
      validate: () => taskRowErrors(tasks.rows, noRate, { ...messages.tasks.errors, rate: '' }),
    },
  );

  return { tasks, saved, submit };
}
