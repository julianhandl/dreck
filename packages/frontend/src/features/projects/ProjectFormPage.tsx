import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import type { Catalog } from '@/catalog/useCatalog';
import { currencySymbol } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { TaskListEditor } from '@/tasks/TaskListEditor';
import { Button } from '@/ui/Button';
import { Page, PageTitle } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { Select } from '@/ui/Select';
import { RateChangeDialog } from './rate-change/RateChangeDialog';
import { useProjectForm } from './useProjectForm';
import { useProjectRoute } from './useProjectRoute';

/**
 * "Neues Project" / "Project bearbeiten": Customer, name, Hourly Rate and Tasks in the
 * two-column form layout, for an existing Project also archive and delete.
 * @example <Route path="projects/:projectId/edit" element={<ProjectFormPage />} />
 */
export function ProjectFormPage(): ReactElement {
  const route = useProjectRoute();
  return (
    <Page>
      <QueryView state={route.catalog}>
        {(catalog) => (
          <ProjectFormContent
            catalog={catalog}
            projectId={route.projectId}
            customerId={route.customerId}
          />
        )}
      </QueryView>
    </Page>
  );
}

type ProjectFormContentProps = {
  catalog: Catalog;
  /** Project to edit; `undefined` for a new one. */
  projectId?: number;
  /** Preselected Customer of a new Project. */
  customerId?: number;
};

function ProjectFormContent({
  catalog,
  projectId,
  customerId,
}: ProjectFormContentProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const project = projectId === undefined ? undefined : catalog.project(projectId);
  const form = useProjectForm({ catalog, project, customerId });
  const { submit } = form;
  const t = messages.projects.form;

  if (projectId !== undefined && !project) return <p>{messages.errors.not_found}</p>;

  const customers = catalog.customers.filter((c) => !c.archived || c.id === project?.customerId);

  return (
    <>
      <PageTitle>{project ? t.editTitle : t.newTitle}</PageTitle>
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit('save')}
        className="flex flex-col gap-6 border-temp-divider border-t pt-6"
      >
        <div className="flex flex-col gap-1">
          <Select
            name="customerId"
            layout="row"
            label={t.customer}
            value={form.customerId}
            options={[
              ...(form.customerId === '' ? [{ value: '', label: t.chooseCustomer }] : []),
              ...customers.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
            onValueChange={form.handleCustomerChange}
            className="w-full max-w-xl"
          />
          <p className="text-sm sm:pl-56">
            <Link
              to="/projects/customers/new"
              className="text-temp-link underline underline-offset-2"
            >
              {messages.projects.newCustomer}
            </Link>
          </p>
        </div>
        <TextField
          name="name"
          layout="row"
          label={t.name}
          required
          value={form.name}
          onValueChange={form.handleNameChange}
        />
        <div className="grid gap-x-8 gap-y-1 border-temp-divider border-t pt-6 sm:grid-cols-[12rem_1fr]">
          <h2 className="font-medium">{t.billing}</h2>
          <div className="flex flex-col gap-2 border border-temp-highlight-border bg-temp-highlight p-5">
            <p className="font-semibold">{t.rateTitle}</p>
            <p className="text-temp-ink-muted">{t.rateHint}</p>
            <div className="w-72">
              <TextField
                name="hourlyRateMinor"
                label={t.rate}
                hideLabel
                inputMode="decimal"
                autoComplete="off"
                prefix={<span>{currencySymbol(currency, language)}</span>}
                suffix={<span className="whitespace-nowrap">{messages.common.perHour}</span>}
                value={form.rate}
                onValueChange={form.handleRateChange}
              />
            </div>
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-3 border-temp-divider border-t pt-6 sm:grid-cols-[12rem_1fr]">
          <h2 className="font-medium">{t.tasks}</h2>
          <div className="flex max-w-4xl flex-col gap-4">
            <p className="text-temp-ink-muted">{t.tasksHint}</p>
            <TaskListEditor list={form.tasks} withRates error={submit.errors.tasks} />
          </div>
        </div>
        <FormStatus submit={submit} />
        <div className="flex flex-wrap gap-3 border-temp-divider border-t pt-6">
          <Button variant="primary" type="submit" aria-disabled={submit.pending}>
            {project ? t.update : t.create}
          </Button>
          <Button as={Link} to={project ? `/projects/${project.id}` : '/projects'}>
            {messages.common.cancel}
          </Button>
          {project && (
            <div className="ml-auto flex gap-3">
              <Button
                aria-disabled={submit.pending}
                onClick={() => submit.handleSubmit(project.archived ? 'restore' : 'archive')}
              >
                {project.archived ? messages.common.restore : messages.common.archive}
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
