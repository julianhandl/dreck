import type { ReactElement } from 'react';
import { PERIODS } from '@/format/calendar';
import { formatDateRange } from '@/format/date';
import { formatDuration } from '@/format/duration';
import { formatMoney } from '@/format/money';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from '@/ui/icons';
import { Page, PageTitle } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import { QueryView } from '@/ui/QueryView';
import { Select } from '@/ui/Select';
import { StatCard } from '@/ui/StatCard';
import { useReportsPage } from './useReportsPage';

const TH = 'px-4 py-3 text-right font-normal whitespace-nowrap';
const NUM = 'px-4 py-4 text-right whitespace-nowrap';
const DATE_INPUT = 'min-h-11 rounded-temp-control border border-temp-border bg-temp-surface px-3';

/**
 * Report screen: period with ← →, filters for Customer and Project, key figures, the table
 * by Customer and Project and the CSV export.
 * @example <Route path="reports" element={<ReportsPage />} />
 */
export function ReportsPage(): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const page = useReportsPage();
  const t = messages.reports;
  const money = (minor: number): string => formatMoney(minor, currency, language);
  const rangeText = formatDateRange(page.range.from, page.range.to, language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const heading =
    page.current && page.period !== 'custom' ? t.currentPeriod[page.period](rangeText) : rangeText;

  return (
    <Page>
      <PageTitle>{t.title}</PageTitle>
      <div className="flex flex-wrap items-center gap-4 border-temp-divider border-b pb-6">
        <div className="flex">
          <Button
            size="icon"
            className="rounded-r-none"
            aria-label={t.previous}
            onClick={() => page.handleShift(-1)}
          >
            <ArrowLeftIcon />
          </Button>
          <Button
            size="icon"
            className="-ml-px rounded-l-none"
            aria-label={t.next}
            onClick={() => page.handleShift(1)}
          >
            <ArrowRightIcon />
          </Button>
        </div>
        <h2 aria-live="polite" className="font-semibold text-3xl">
          {heading}
        </h2>
        <div className="flex flex-wrap items-end gap-3 sm:ml-auto">
          {page.period === 'custom' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm">{t.from}</span>
                <input
                  type="date"
                  className={DATE_INPUT}
                  value={page.range.from}
                  onChange={(e) =>
                    e.target.value &&
                    page.handleRangeChange({ ...page.range, from: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm">{t.to}</span>
                <input
                  type="date"
                  className={DATE_INPUT}
                  value={page.range.to}
                  onChange={(e) =>
                    e.target.value && page.handleRangeChange({ ...page.range, to: e.target.value })
                  }
                />
              </label>
            </>
          )}
          <Select
            label={t.period}
            hideLabel
            value={page.period}
            options={[...PERIODS, 'custom' as const].map((p) => ({
              value: p,
              label: t.periods[p],
            }))}
            onValueChange={page.handlePeriodChange}
            className="min-w-40"
          />
        </div>
      </div>
      <QueryView state={page.data}>
        {({ catalog, report }) => {
          const projects = catalog.projects.filter(
            (p) => page.customerId === 'all' || String(p.customerId) === page.customerId,
          );
          const { totals } = report;
          return (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <Select
                  label={t.customer}
                  hideLabel
                  value={page.customerId}
                  options={[
                    { value: 'all', label: t.allCustomers },
                    ...catalog.customers.map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                  onValueChange={page.handleCustomerChange}
                />
                <Select
                  label={t.project}
                  hideLabel
                  value={page.projectId}
                  options={[
                    { value: 'all', label: t.allProjects },
                    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                  ]}
                  onValueChange={page.handleProjectChange}
                />
                {(page.customerId !== 'all' || page.projectId !== 'all') && (
                  <Button variant="link" size="sm" onClick={page.handleClearFilters}>
                    <XIcon />
                    {t.clearFilters}
                  </Button>
                )}
                <Button as="a" href={page.csvUrl} download className="sm:ml-auto">
                  {messages.common.exportCsv}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title={t.hours}
                  value={formatDuration(totals.roundedSeconds)}
                  rows={[[t.exact, formatDuration(totals.seconds)]]}
                />
                <StatCard
                  title={t.toInvoice}
                  value={money(totals.amountMinor + totals.billableExpensesMinor)}
                  tone="success"
                  rows={[
                    [t.time, money(totals.amountMinor)],
                    [t.billableExpenses, money(totals.billableExpensesMinor)],
                  ]}
                />
                <StatCard title={t.ownExpenses} value={money(totals.ownExpensesMinor)} rows={[]} />
              </div>

              {report.customers.length === 0 ? (
                <p className="rounded-temp-card bg-temp-band px-6 py-12 text-center text-temp-ink-muted">
                  {t.empty}
                </p>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full min-w-3xl border-collapse">
                    <thead className="border-temp-divider border-b bg-temp-band text-temp-ink-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left font-normal">
                          {t.columns.name}
                        </th>
                        <th scope="col" className={TH}>
                          {t.columns.hours}
                        </th>
                        <th scope="col" className={TH}>
                          {t.columns.rounded}
                        </th>
                        <th scope="col" className={TH}>
                          {t.columns.amount}
                        </th>
                        <th scope="col" className={TH}>
                          {t.columns.billableExpenses}
                        </th>
                        <th scope="col" className={TH}>
                          {t.columns.ownExpenses}
                        </th>
                      </tr>
                    </thead>
                    {report.customers.map((customer) => (
                      <tbody key={customer.id}>
                        <tr className="border-temp-divider border-b bg-temp-band font-semibold">
                          <th scope="rowgroup" className="px-4 py-3 text-left">
                            <span className="flex items-center gap-3">
                              {customer.name}
                              {customer.archived && <Pill>{messages.common.archived}</Pill>}
                            </span>
                          </th>
                          <td className={NUM}>{formatDuration(customer.seconds)}</td>
                          <td className={NUM}>{formatDuration(customer.roundedSeconds)}</td>
                          <td className={NUM}>{money(customer.amountMinor)}</td>
                          <td className={NUM}>{money(customer.billableExpensesMinor)}</td>
                          <td className={NUM}>{money(customer.ownExpensesMinor)}</td>
                        </tr>
                        {customer.projects.map((project) => (
                          <tr key={project.id} className="border-temp-divider border-b">
                            <th scope="row" className="px-4 py-4 pl-8 text-left font-normal">
                              <span className="flex items-center gap-3">
                                {project.name}
                                {project.archived && <Pill>{messages.common.archived}</Pill>}
                              </span>
                            </th>
                            <td className={NUM}>{formatDuration(project.seconds)}</td>
                            <td className={NUM}>{formatDuration(project.roundedSeconds)}</td>
                            <td className={NUM}>{money(project.amountMinor)}</td>
                            <td className={NUM}>{money(project.billableExpensesMinor)}</td>
                            <td className={NUM}>{money(project.ownExpensesMinor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                    <tfoot>
                      <tr className="font-semibold">
                        <th scope="row" className="px-4 py-4 text-left">
                          {messages.common.total}
                        </th>
                        <td className={NUM}>{formatDuration(totals.seconds)}</td>
                        <td className={NUM}>{formatDuration(totals.roundedSeconds)}</td>
                        <td className={NUM}>{money(totals.amountMinor)}</td>
                        <td className={NUM}>{money(totals.billableExpensesMinor)}</td>
                        <td className={NUM}>{money(totals.ownExpensesMinor)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          );
        }}
      </QueryView>
    </Page>
  );
}
