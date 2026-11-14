import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { FormStatus } from '@/forms/FormStatus';
import { useI18n } from '@/i18n/useI18n';
import { TaskListEditor } from '@/tasks/TaskListEditor';
import { Button } from '@/ui/Button';
import { Page, PageTitle } from '@/ui/Page';
import { SettingsNav } from './SettingsNav';
import { useDefaultTasksPage } from './useDefaultTasksPage';

/**
 * Settings page "Tasks": the Default Tasks that new Projects copy.
 * @example <Route path="settings/tasks" element={<DefaultTasksPage />} />
 */
export function DefaultTasksPage(): ReactElement {
  const { messages } = useI18n();
  const page = useDefaultTasksPage();
  const { submit } = page;
  const t = messages.settings;

  return (
    <Page>
      <PageTitle>{messages.nav.settings}</PageTitle>
      <SettingsNav />
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit(null)}
        className="grid gap-x-8 gap-y-3 border-temp-divider border-t pt-6 sm:grid-cols-[12rem_1fr]"
      >
        <div>
          <h2 className="font-medium">{t.defaultTasks}</h2>
        </div>
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="text-temp-ink-muted">{t.defaultTasksHint}</p>
          <TaskListEditor list={page.tasks} error={submit.errors.defaultTasks} />
          <FormStatus submit={submit} />
          <p role="status" className="font-medium text-temp-success empty:sr-only">
            {page.saved ? t.saved : ''}
          </p>
          <div className="border-temp-divider border-t pt-6">
            <Button variant="primary" type="submit" aria-disabled={submit.pending}>
              {t.saveTasks}
            </Button>
          </div>
        </div>
      </Form>
    </Page>
  );
}
