import { Tabs } from '@base-ui/react/tabs';
import type { Estimate } from '@dreck/shared/api/estimates';
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
import { EstimateStatusPill } from './EstimateStatusPill';
import { displayStatus } from './estimate-display';
import { type EstimateTab, useEstimatesPage } from './useEstimatesPage';

/** Columns that small screens leave out, so number and amount stay visible. */
const OPTIONAL = 'max-sm:hidden';

const TAB =
  'inline-flex min-h-11 items-center gap-2 border-transparent border-b-2 px-4 font-medium text-temp-ink-muted hover:text-temp-ink data-active:border-temp-accent data-active:text-temp-ink';

/**
 * Estimates screen: "Neues Angebot", tabs Offen/Alle with a Customer filter and the table of
 * Estimates.
 * @example <Route path="estimates" element={<EstimatesPage />} />
 */
export function EstimatesPage(): ReactElement {
  const { messages } = useI18n();
  const page = useEstimatesPage();
  const t = messages.estimates;

  return (
    <Page>
      <div className="flex flex-wrap items-center gap-4">
        <PageTitle>{t.title}</PageTitle>
        <Button as={Link} to="/estimates/new" variant="primary" className="sm:ml-auto">
          <PlusIcon />
          {t.new}
        </Button>
      </div>
      <QueryView state={page.data}>
        {({ catalog, estimates, any, openCount }) =>
          any ? (
            <Tabs.Root
              value={page.tab}
              onValueChange={(value: EstimateTab) => page.handleTabChange(value)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-temp-divider border-b">
                <Tabs.List aria-label={t.tabs.label} className="flex">
                  <Tabs.Tab value="open" className={TAB}>
                    {t.tabs.open}
                    <span className="rounded-temp-pill bg-temp-band px-2 text-sm">{openCount}</span>
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
                  <EstimateTable estimates={estimates} catalog={catalog} today={page.today} />
                </Tabs.Panel>
              ))}
            </Tabs.Root>
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

type EstimateTableProps = {
  /** Estimates of the current tab and filter, newest first. */
  estimates: Estimate[];
  /** For the Customer names. */
  catalog: Catalog;
  today: string;
};

/**
 * Table of Estimates: status with validity, estimate date, number (link), Customer with
 * subject and amount.
 * @example <EstimateTable estimates={estimates} catalog={catalog} today="2026-11-12" />
 */
function EstimateTable({ estimates, catalog, today }: EstimateTableProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const t = messages.estimates;
  const customerName = (id: number): string =>
    catalog.customers.find((c) => c.id === id)?.name ?? '';

  if (estimates.length === 0) {
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
            <th scope="col" className={`${OPTIONAL} px-4 py-3 text-left font-normal`}>
              {t.columns.issueDate}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-normal">
              {t.columns.number}
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
          {estimates.map((estimate) => {
            const status = displayStatus(estimate, today);
            const showValidity = (status === 'sent' || status === 'expired') && estimate.validUntil;
            return (
              <tr key={estimate.id} className="border-temp-divider border-b last:border-b-0">
                <td className="px-4 py-3">
                  <span className="flex flex-col items-start gap-1">
                    <EstimateStatusPill status={status} />
                    {showValidity && (
                      <span className={status === 'expired' ? 'text-temp-danger' : ''}>
                        {t.validUntil(formatDate(estimate.validUntil ?? '', language))}
                      </span>
                    )}
                  </span>
                </td>
                <td className={`${OPTIONAL} px-4 py-3 whitespace-nowrap`}>
                  {formatDate(estimate.issueDate, language)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/estimates/${estimate.id}`}
                    className="font-medium text-temp-link underline underline-offset-2"
                  >
                    {estimate.number}
                  </Link>
                </td>
                <td className={`${OPTIONAL} px-4 py-3`}>
                  {customerName(estimate.customerId)}
                  {estimate.subject && (
                    <span className="block text-temp-ink-muted">{estimate.subject}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {formatMoney(estimate.totalMinor, currency, language)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
