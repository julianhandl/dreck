import type { ReactElement } from 'react';
import { formatDate, formatDateRange } from '@/format/date';
import { formatMoney } from '@/format/money';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { PlusIcon } from '@/ui/icons';
import { Page, PageTitle } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import { QueryView } from '@/ui/QueryView';
import { ExpenseForm } from './ExpenseForm';
import { useExpensesPage } from './useExpensesPage';

const WEEK_RANGE: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

/**
 * Expenses screen: "Expense erfassen" opens the form panel, below the Expenses by week.
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
        {({ catalog, expenses, weeks }) => (
          <>
            <div>
              <Button
                variant="primary"
                aria-disabled={page.editing === 'new'}
                onClick={() => page.handleEdit('new')}
              >
                <PlusIcon />
                {t.track}
              </Button>
            </div>
            {page.editing === 'new' && (
              <ExpenseForm
                catalog={catalog}
                expenses={expenses}
                today={page.today}
                onClose={() => page.handleEdit(null)}
              />
            )}
            {weeks.length === 0 && page.editing !== 'new' && (
              <p className="rounded-temp-card bg-temp-band px-6 py-12 text-center text-temp-ink-muted">
                {t.empty}
              </p>
            )}
            {weeks.map((week) => (
              <section key={week.from} aria-labelledby={`week-${week.from}`}>
                <h2
                  id={`week-${week.from}`}
                  className="border-temp-divider border-y bg-temp-band px-4 py-3 font-semibold"
                >
                  {formatDateRange(week.from, week.to, language, WEEK_RANGE)}
                </h2>
                <ul>
                  {week.expenses.map((expense) => {
                    if (page.editing === expense.id) {
                      return (
                        <li key={expense.id}>
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
                        className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-temp-divider border-b px-4 py-4 sm:grid-cols-[9rem_1fr_auto_auto]"
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
                <p className="flex justify-end gap-10 px-4 py-4 sm:pr-24">
                  <span>{messages.common.total}:</span>
                  <span className="font-semibold">{money(week.totalMinor)}</span>
                </p>
              </section>
            ))}
          </>
        )}
      </QueryView>
    </Page>
  );
}
