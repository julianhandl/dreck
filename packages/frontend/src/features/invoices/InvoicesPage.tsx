import { Tabs } from '@base-ui/react/tabs';
import type { Invoice } from '@dreck/shared/api/invoices';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import type { Catalog } from '@/catalog/useCatalog';
import { formatDate } from '@/format/date';
import { formatMoney } from '@/format/money';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { PlusIcon } from '@/ui/icons';
import { Page, PageTitle } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { Select } from '@/ui/Select';
import { StatCard } from '@/ui/StatCard';
import { InvoiceStatusPill } from './InvoiceStatusPill';
import { displayStatus, relativeDue } from './invoice-display';
import { type InvoiceTab, useInvoicesPage } from './useInvoicesPage';

/** Columns that small screens leave out, so number and amount stay visible. */
const OPTIONAL = 'max-sm:hidden';

const TAB =
  'inline-flex min-h-11 items-center gap-2 border-transparent border-b-2 px-4 font-medium text-temp-ink-muted hover:text-temp-ink data-active:border-temp-accent data-active:text-temp-ink';

/**
 * Invoices screen: "Neue Invoice", key figures for open and paid amounts, tabs Offen/Alle with
 * a Customer filter and the table of Invoices.
 * @example <Route path="invoices" element={<InvoicesPage />} />
 */
export function InvoicesPage(): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const page = useInvoicesPage();
  const t = messages.invoices;
  const money = (minor: number): string => formatMoney(minor, currency, language);

  return (
    <Page>
      <div className="flex flex-wrap items-center gap-4">
        <PageTitle>{t.title}</PageTitle>
        <Button as={Link} to="/invoices/new" variant="primary" className="sm:ml-auto">
          <PlusIcon />
          {t.new}
        </Button>
      </div>
      <QueryView state={page.data}>
        {({ catalog, invoices, any, openCount, figures }) =>
          any ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <StatCard
                  title={t.open}
                  value={money(figures.openMinor)}
                  rows={[
                    [t.overdue, money(figures.overdueMinor)],
                    [t.drafts, money(figures.draftsMinor)],
                  ]}
                />
                <StatCard
                  title={t.paidIn(page.today.slice(0, 4))}
                  value={money(figures.paidMinor)}
                  tone="success"
                  rows={[]}
                />
              </div>
              <Tabs.Root
                value={page.tab}
                onValueChange={(value: InvoiceTab) => page.handleTabChange(value)}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-wrap items-end justify-between gap-3 border-temp-divider border-b">
                  <Tabs.List aria-label={t.tabs.label} className="flex">
                    <Tabs.Tab value="open" className={TAB}>
                      {t.tabs.open}
                      <span className="rounded-temp-pill bg-temp-band px-2 text-sm">
                        {openCount}
                      </span>
                    </Tabs.Tab>
                    <Tabs.Tab value="all" className={TAB}>
                      {t.tabs.all}
                    </Tabs.Tab>
                  </Tabs.List>
                  <div className="pb-2">
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
                  </div>
                </div>
                {(['open', 'all'] as const).map((tab) => (
                  <Tabs.Panel key={tab} value={tab}>
                    <InvoiceTable invoices={invoices} catalog={catalog} today={page.today} />
                  </Tabs.Panel>
                ))}
              </Tabs.Root>
            </>
          ) : (
            <p className="rounded-temp-card bg-temp-band px-6 py-12 text-center text-temp-ink-muted">
              {t.emptyStart}
            </p>
          )
        }
      </QueryView>
    </Page>
  );
}

type InvoiceTableProps = {
  /** Invoices of the current tab and filter, newest first. */
  invoices: Invoice[];
  /** For the Customer names. */
  catalog: Catalog;
  today: string;
};

/**
 * Table of Invoices: status with due text, issue date, number (link), Customer and amount,
 * the sum in the footer.
 * @example <InvoiceTable invoices={invoices} catalog={catalog} today="2026-11-12" />
 */
function InvoiceTable({ invoices, catalog, today }: InvoiceTableProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const t = messages.invoices;
  const money = (minor: number): string => formatMoney(minor, currency, language);
  const customerName = (id: number): string =>
    catalog.customers.find((c) => c.id === id)?.name ?? '';

  if (invoices.length === 0) {
    return (
      <p className="rounded-temp-card bg-temp-band px-6 py-12 text-center text-temp-ink-muted">
        {t.empty}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-temp-card bg-temp-surface shadow-temp-card">
      <table className="w-full border-collapse">
        <thead className="border-temp-divider border-b text-temp-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-normal">
              {t.columns.status}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-normal">
              {t.columns.number}
            </th>
            <th scope="col" className={`${OPTIONAL} px-4 py-3 text-left font-normal`}>
              {t.columns.issueDate}
            </th>
            <th scope="col" className={`${OPTIONAL} px-4 py-3 text-left font-normal`}>
              {t.columns.customer}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              {t.columns.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const status = displayStatus(invoice, today);
            let note = t.notSent;
            if (invoice.paidOn) note = t.paidOn(formatDate(invoice.paidOn, language));
            else if (invoice.sentOn) note = t.due(relativeDue(invoice.dueDate, today, language));
            return (
              <tr key={invoice.id} className="border-temp-divider border-b last:border-b-0">
                <td className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-3">
                    <InvoiceStatusPill status={status} />
                    <span className={status === 'late' ? 'text-temp-danger' : ''}>{note}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/invoices/${invoice.id}`}
                    className="font-medium text-temp-link underline underline-offset-2"
                  >
                    {invoice.number}
                  </Link>
                </td>
                <td className={`${OPTIONAL} px-4 py-3 whitespace-nowrap`}>
                  {formatDate(invoice.issueDate, language)}
                </td>
                <td className={`${OPTIONAL} px-4 py-3`}>{customerName(invoice.customerId)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {money(invoice.totalMinor)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-temp-divider border-t font-semibold">
            <th scope="row" colSpan={2} className="px-4 py-3 text-right">
              {messages.common.total}
            </th>
            <td colSpan={2} className={OPTIONAL} />
            <td className="px-4 py-3 text-right whitespace-nowrap">
              {money(invoices.reduce((sum, i) => sum + i.totalMinor, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
