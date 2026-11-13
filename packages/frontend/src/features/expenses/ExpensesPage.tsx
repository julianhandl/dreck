import type { ReactElement } from 'react';
import type { Catalog } from '@/catalog/useCatalog';
import { formatDate } from '@/format/date';
import { formatMoney } from '@/format/money';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { PlusIcon, XIcon } from '@/ui/icons';
import { Page, PageTitle } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import { QueryView } from '@/ui/QueryView';
import { Select } from '@/ui/Select';
import { ExpenseForm } from './ExpenseForm';
import {
  BILLABLE_FILTERS,
  type ExpensesPage as ExpensesPageState,
  useExpensesPage,
} from './useExpensesPage';

const MONTH: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

/**
 * Expenses screen: "Ausgabe erfassen" opens the form panel, below the Expenses by month.
 * @example <Route path="expenses" element={<ExpensesPage />} />
 */
export function ExpensesPage(): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const page = useExpensesPage();
  const t = messages.expenses;
  const money = (minor: number): string => formatMoney(minor, currency, language);

  return (
    <Page>
      <PageTitle>{t.title}</PageTitle>
      <QueryView state={page.data}>
        {({ catalog, expenses, months }) => (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <Button
                variant="primary"
                aria-disabled={page.editing === 'new'}
                onClick={() => page.handleEdit('new')}
                className="mr-auto"
              >
                <PlusIcon />
                {t.track}
              </Button>
              {expenses.length > 0 && <ExpenseFilters page={page} catalog={catalog} />}
            </div>
            {page.editing === 'new' && (
              <ExpenseForm
                catalog={catalog}
                expenses={expenses}
                today={page.today}
                onClose={() => page.handleEdit(null)}
              />
            )}
            {months.length === 0 && page.editing !== 'new' && (
              <p className="rounded-temp-card bg-temp-band px-6 py-12 text-center text-temp-ink-muted">
                {page.filtered ? t.emptyFiltered : t.empty}
              </p>
            )}
            {months.map((group) => (
              <section key={group.month} aria-labelledby={`month-${group.month}`}>
                <h2
                  id={`month-${group.month}`}
                  className="border-temp-divider border-y bg-temp-band px-4 py-3 font-semibold"
                >
                  {formatDate(`${group.month}-01`, language, MONTH)}
                </h2>
                <div className="grid grid-cols-[1fr_auto] gap-x-6 sm:grid-cols-[9rem_1fr_auto_auto]">
                  <ul className="col-span-full grid grid-cols-subgrid">
                    {group.expenses.map((expense) => {
                      if (page.editing === expense.id) {
                        return (
                          <li key={expense.id} className="col-span-full">
                            <ExpenseForm
                              catalog={catalog}
                              expenses={expenses}
                              expense={expense}
                              today={page.today}
                              onClose={() => page.handleEdit(null)}
                            />
                          </li>
                        );
                      }
                      const project = catalog.project(expense.projectId);
                      const customer = project && catalog.customerOf(project);
                      return (
                        <li
                          key={expense.id}
                          className="col-span-full grid grid-cols-subgrid items-center gap-y-1 border-temp-divider border-b px-4 py-4"
                        >
                          <span className="col-span-2 sm:col-span-1 sm:self-start">
                            {formatDate(expense.date, language, {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                          <div className="min-w-0">
                            <p>
                              <span className="font-semibold">{project?.name}</span>
                              {customer && <span> ({customer.name})</span>}
                            </p>
                            <p className="flex flex-wrap items-center gap-2">
                              {expense.description}
                              {expense.billable && <Pill>{messages.common.billable}</Pill>}
                              {expense.invoiceItemId !== null && (
                                <Pill>{messages.common.invoiced}</Pill>
                              )}
                            </p>
                          </div>
                          <span className="text-right font-semibold">
                            {money(expense.amountMinor)}
                          </span>
                          <Button
                            size="sm"
                            className="col-start-2 justify-self-end sm:col-start-4"
                            aria-label={t.editFor(expense.description)}
                            onClick={() => page.handleEdit(expense.id)}
                          >
                            {messages.common.edit}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="col-span-full grid grid-cols-subgrid px-4 py-4">
                    <span className="justify-self-end sm:col-start-2">
                      {messages.common.total}:
                    </span>
                    <span className="text-right font-semibold">{money(group.totalMinor)}</span>
                  </p>
                </div>
              </section>
            ))}
          </>
        )}
      </QueryView>
    </Page>
  );
}

type ExpenseFiltersProps = {
  page: ExpensesPageState;
  catalog: Catalog;
};

/**
 * Filters for Customer, Project and Billable; the Project list follows the chosen Customer.
 * @example <ExpenseFilters page={page} catalog={catalog} />
 */
function ExpenseFilters({ page, catalog }: ExpenseFiltersProps): ReactElement {
  const { messages } = useI18n();
  const t = messages.expenses;
  const projects = catalog.projects.filter(
    (p) => page.customerId === 'all' || String(p.customerId) === page.customerId,
  );
  return (
    <>
      <Select
        label={t.customerFilter}
        hideLabel
        value={page.customerId}
        options={[
          { value: 'all', label: t.allCustomers },
          ...catalog.customers.map((c) => ({ value: String(c.id), label: c.name })),
        ]}
        onValueChange={page.handleCustomerChange}
      />
      <Select
        label={t.projectFilter}
        hideLabel
        value={page.projectId}
        options={[
          { value: 'all', label: t.allProjects },
          ...projects.map((p) => ({ value: String(p.id), label: p.name })),
        ]}
        onValueChange={page.handleProjectChange}
      />
      <Select
        label={t.billableFilter}
        hideLabel
        value={page.billable}
        options={BILLABLE_FILTERS.map((b) => ({ value: b, label: t.billableOptions[b] }))}
        onValueChange={page.handleBillableChange}
      />
      {page.filtered && (
        <Button variant="link" size="sm" onClick={page.handleClearFilters}>
          <XIcon />
          {t.clearFilters}
        </Button>
      )}
    </>
  );
}
