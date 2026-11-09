import type { ReactElement } from 'react';
import { Link, useNavigate } from 'react-router';
import { formatDuration } from '@/format/duration';
import { formatMoney } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { ActionsMenu } from '@/ui/ActionsMenu';
import { Button } from '@/ui/Button';
import { PlusIcon } from '@/ui/icons';
import { Page, PageTitle } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import { projectColorStyle } from '@/ui/project-color';
import { QueryView } from '@/ui/QueryView';
import { SearchField } from '@/ui/SearchField';
import { Select } from '@/ui/Select';
import { STATUS_FILTERS, useProjectsPage } from './useProjectsPage';

const NUM = 'px-4 py-4 text-right whitespace-nowrap';

/**
 * Projects screen: toolbar, filters and a table of Projects grouped by Customer with the
 * sums of all time and an actions menu per Project.
 * @example <Route path="projects" element={<ProjectsPage />} />
 */
export function ProjectsPage(): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const navigate = useNavigate();
  const page = useProjectsPage();
  const t = messages.projects;
  const money = (minor: number): string => formatMoney(minor, currency, language);

  return (
    <Page
      toolbar={
        <>
          <Button as={Link} to="/projects/new" variant="primary">
            <PlusIcon />
            {t.newProject}
          </Button>
          <Button as={Link} to="/projects/customers/new">
            <PlusIcon />
            {t.newCustomer}
          </Button>
          <SearchField
            label={t.search}
            value={page.search}
            onValueChange={page.handleSearchChange}
            className="w-full sm:ml-auto sm:w-96"
          />
        </>
      }
    >
      <PageTitle>{messages.nav.projects}</PageTitle>
      <QueryView state={page.data}>
        {({ catalog, groups, counts }) => (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <Select
                label={t.statusFilter}
                hideLabel
                value={page.status}
                options={STATUS_FILTERS.map((s) => ({ value: s, label: t.status[s](counts[s]) }))}
                onValueChange={page.handleStatusChange}
              />
              <div className="sm:ml-auto">
                <Select
                  label={t.customerFilter}
                  hideLabel
                  value={page.customerFilter}
                  options={[
                    { value: 'all', label: t.allCustomers },
                    ...catalog.customers.map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                  onValueChange={page.handleCustomerFilterChange}
                />
              </div>
            </div>
            <FormStatus submit={page.action} />
            {groups.length === 0 ? (
              <p className="rounded-temp-card bg-temp-band px-6 py-12 text-center text-temp-ink-muted">
                {catalog.customers.length === 0 ? t.emptyStart : t.empty}
              </p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-3xl border-collapse">
                  <thead className="border-temp-divider border-b bg-temp-band text-left text-temp-ink-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-normal">
                        {t.columns.project}
                      </th>
                      <th scope="col" className={`${NUM} font-normal`}>
                        {t.columns.rate}
                      </th>
                      <th scope="col" className={`${NUM} font-normal`}>
                        {t.columns.hours}
                      </th>
                      <th scope="col" className={`${NUM} font-normal`}>
                        {t.columns.amount}
                      </th>
                      <th scope="col" className={`${NUM} font-normal`}>
                        {t.columns.billableExpenses}
                      </th>
                      <th scope="col" className={`${NUM} font-normal`}>
                        {t.columns.ownExpenses}
                      </th>
                      <th scope="col">
                        <span className="sr-only">{messages.common.actions}</span>
                      </th>
                    </tr>
                  </thead>
                  {groups.map(({ customer, projects }) => (
                    <tbody key={customer.id}>
                      <tr className="border-temp-divider border-b bg-temp-band">
                        <th
                          scope="rowgroup"
                          colSpan={7}
                          className="px-4 py-3 text-left font-normal"
                        >
                          <span className="flex items-center gap-3">
                            <Link
                              to={`/projects/customers/${customer.id}/edit`}
                              className="underline underline-offset-2"
                            >
                              {customer.name}
                            </Link>
                            {customer.archived && <Pill>{messages.common.archived}</Pill>}
                          </span>
                        </th>
                      </tr>
                      {projects.map((project) => {
                        const sums = page.sums(project.id);
                        const actions = [
                          {
                            label: messages.common.edit,
                            onSelect: () => navigate(`/projects/${project.id}/edit`),
                          },
                          project.archived
                            ? {
                                label: messages.common.restore,
                                onSelect: () =>
                                  page.action.handleSubmit({ kind: 'restore', project }),
                              }
                            : {
                                label: messages.common.archive,
                                onSelect: () =>
                                  page.action.handleSubmit({ kind: 'archive', project }),
                              },
                          {
                            label: messages.common.delete,
                            danger: true,
                            onSelect: () => page.action.handleSubmit({ kind: 'delete', project }),
                          },
                        ];
                        return (
                          <tr key={project.id} className="border-temp-divider border-b">
                            <th scope="row" className="px-4 py-4 text-left">
                              <span className="flex items-center gap-3">
                                <span
                                  aria-hidden="true"
                                  className="size-3 shrink-0 rounded-full bg-temp-project"
                                  style={projectColorStyle(project.id)}
                                />
                                <Link
                                  to={`/projects/${project.id}`}
                                  className="font-semibold hover:underline"
                                >
                                  {project.name}
                                </Link>
                                {project.archived && <Pill>{messages.common.archived}</Pill>}
                              </span>
                            </th>
                            <td className={NUM}>{money(project.hourlyRateMinor)}</td>
                            <td className={NUM}>{formatDuration(sums?.roundedSeconds ?? 0)}</td>
                            <td className={NUM}>{money(sums?.amountMinor ?? 0)}</td>
                            <td className={NUM}>{money(sums?.billableExpensesMinor ?? 0)}</td>
                            <td className={NUM}>{money(sums?.ownExpensesMinor ?? 0)}</td>
                            <td className="px-4 py-3 text-right">
                              <ActionsMenu
                                label={messages.common.actions}
                                ariaLabel={messages.common.actionsFor(project.name)}
                                actions={actions}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
          </>
        )}
      </QueryView>
    </Page>
  );
}
