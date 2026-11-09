import { Tabs } from '@base-ui/react/tabs';
import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router';
import { withQuery } from '@/api/api-client';
import { elapsedSeconds } from '@/clock/useNow';
import { ALL_TIME } from '@/format/calendar';
import { formatDate } from '@/format/date';
import { formatDuration } from '@/format/duration';
import { formatMoney } from '@/format/money';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { ArrowLeftIcon, BarsIcon, PencilIcon, TrendIcon } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import { QueryView } from '@/ui/QueryView';
import { StatCard } from '@/ui/StatCard';
import { WeeklyChart } from '@/ui/WeeklyChart';
import { useProjectDetail } from './useProjectDetail';

const TOGGLE =
  'inline-flex min-h-11 items-center gap-2 border border-temp-border px-4 first:rounded-l-temp-control last:rounded-r-temp-control -ml-px first:ml-0 data-active:z-1 data-active:border-temp-accent data-active:bg-temp-accent-soft';
const TAB =
  'min-h-11 border-transparent border-b-2 px-1 text-temp-ink-muted data-active:border-temp-accent data-active:text-temp-ink';
const TH = 'px-4 py-3 font-normal';
const NUM = 'px-4 py-4 text-right whitespace-nowrap';

/**
 * Project screen: Customer and name, chart of the hours, key figures of all time and the
 * Time Entries and Expenses of the Project.
 * @example <Route path="projects/:projectId" element={<ProjectDetailPage />} />
 */
export function ProjectDetailPage(): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const { projectId, data } = useProjectDetail();
  const t = messages.projectDetail;
  const money = (minor: number): string => formatMoney(minor, currency, language);
  const hours = (value: number): string => formatDuration(Math.round(value * 3600));
  const csv = withQuery('/api/v1/reports', { ...ALL_TIME, projectId, format: 'csv' });

  return (
    <Page
      toolbar={
        <Button as={Link} to="/projects">
          <ArrowLeftIcon />
          {t.back}
        </Button>
      }
    >
      <QueryView state={data}>
        {(detail) => {
          if (!detail) return <p>{messages.errors.not_found}</p>;
          const { project, customer, totals, entries, expenses } = detail;
          const expensesTotal = totals.billableExpensesMinor + totals.ownExpensesMinor;
          return (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <p>{customer?.name}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-semibold text-temp-page-title leading-tight">
                      {project.name}
                    </h1>
                    <Pill>
                      {money(project.hourlyRateMinor)} {messages.common.perHour}
                    </Pill>
                    {project.archived && <Pill>{messages.common.archived}</Pill>}
                  </div>
                </div>
                <Button as={Link} to={`/projects/${project.id}/edit`} className="ml-auto">
                  <PencilIcon />
                  {t.edit}
                </Button>
              </div>

              <section
                aria-label={t.chart}
                className="rounded-temp-card border border-temp-divider p-4 sm:p-6"
              >
                <Tabs.Root defaultValue="progress" className="flex flex-col gap-6">
                  <Tabs.List className="flex">
                    <Tabs.Tab value="progress" className={TOGGLE}>
                      <TrendIcon />
                      {t.progress}
                    </Tabs.Tab>
                    <Tabs.Tab value="weekly" className={TOGGLE}>
                      <BarsIcon />
                      {t.hoursPerWeek}
                    </Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="progress">
                    <WeeklyChart
                      points={detail.progress}
                      mode="line"
                      unit={messages.common.hours}
                      currentLabel={t.thisWeek}
                      formatValue={hours}
                      caption={t.progress}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel value="weekly">
                    <WeeklyChart
                      points={detail.weekly}
                      mode="bars"
                      unit={messages.common.hours}
                      currentLabel={t.thisWeek}
                      formatValue={hours}
                      caption={t.hoursPerWeek}
                    />
                  </Tabs.Panel>
                </Tabs.Root>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title={t.totalHours}
                  value={formatDuration(totals.seconds)}
                  rows={[[t.rounded, formatDuration(totals.roundedSeconds)]]}
                />
                <StatCard
                  title={t.timeAmount}
                  value={money(totals.amountMinor)}
                  rows={[[t.rate, money(project.hourlyRateMinor)]]}
                />
                <StatCard
                  title={t.expenses}
                  value={money(expensesTotal)}
                  rows={[
                    [messages.common.billable, money(totals.billableExpensesMinor)],
                    [t.ownExpenses, money(totals.ownExpensesMinor)],
                  ]}
                />
                <StatCard
                  title={t.toInvoice}
                  value={money(totals.amountMinor + totals.billableExpensesMinor)}
                  rows={[]}
                />
              </div>

              <Tabs.Root defaultValue="time" className="flex flex-col gap-4">
                <Tabs.List className="flex gap-8 border-temp-divider border-b">
                  <Tabs.Tab value="time" className={TAB}>
                    {t.timeEntries}
                  </Tabs.Tab>
                  <Tabs.Tab value="expenses" className={TAB}>
                    {t.expenses}
                  </Tabs.Tab>
                </Tabs.List>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-semibold text-3xl">{messages.common.allTime}</h2>
                  <Button as="a" href={csv} download className="ml-auto">
                    {messages.common.exportCsv}
                  </Button>
                </div>
                <Tabs.Panel value="time">
                  <DataTable
                    head={[
                      messages.common.date,
                      messages.common.description,
                      t.rate,
                      messages.common.hours,
                    ]}
                    empty={entries.length === 0 ? t.noTimeEntries : null}
                    total={formatDuration(
                      entries.reduce((s, e) => s + elapsedSeconds(e, detail.now), 0),
                    )}
                    totalLabel={messages.common.total}
                  >
                    {entries.map((e) => (
                      <tr key={e.id} className="border-temp-divider border-b">
                        <td className="px-4 py-4 whitespace-nowrap">
                          {formatDate(e.date, language)}
                        </td>
                        <td className="px-4 py-4">{e.description}</td>
                        <td className={NUM}>{money(e.hourlyRateMinor)}</td>
                        <td className={NUM}>{formatDuration(elapsedSeconds(e, detail.now))}</td>
                      </tr>
                    ))}
                  </DataTable>
                </Tabs.Panel>
                <Tabs.Panel value="expenses">
                  <DataTable
                    head={[
                      messages.common.date,
                      messages.common.description,
                      messages.common.billable,
                      t.amount,
                    ]}
                    empty={expenses.length === 0 ? t.noExpenses : null}
                    total={money(expensesTotal)}
                    totalLabel={messages.common.total}
                  >
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-temp-divider border-b">
                        <td className="px-4 py-4 whitespace-nowrap">
                          {formatDate(e.date, language)}
                        </td>
                        <td className="px-4 py-4">{e.description}</td>
                        <td className={NUM}>
                          {e.billable ? messages.common.yes : messages.common.no}
                        </td>
                        <td className={NUM}>{money(e.amountMinor)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </Tabs.Panel>
              </Tabs.Root>
            </>
          );
        }}
      </QueryView>
    </Page>
  );
}

type DataTableProps = {
  /** Column headings; the last two are right-aligned numbers. */
  head: string[];
  /** Text instead of the table when there are no rows. */
  empty: string | null;
  /** Sum in the last column. */
  total: string;
  totalLabel: string;
  /** Rows `<tr>` with as many cells as `head`. */
  children: ReactNode;
};

function DataTable({ head, empty, total, totalLabel, children }: DataTableProps): ReactElement {
  if (empty)
    return (
      <p className="rounded-temp-card bg-temp-band px-6 py-10 text-center text-temp-ink-muted">
        {empty}
      </p>
    );
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-xl border-collapse">
        <thead className="border-temp-divider border-b bg-temp-band text-temp-ink-muted">
          <tr>
            {head.map((label, i) => (
              <th
                key={label}
                scope="col"
                className={`${TH} ${i >= head.length - 2 ? 'text-right' : 'text-left'}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" colSpan={head.length - 1} className="px-4 py-4 text-left">
              {totalLabel}
            </th>
            <td className={NUM}>{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
