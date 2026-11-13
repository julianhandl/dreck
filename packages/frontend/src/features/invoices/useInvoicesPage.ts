import type { Invoice } from '@dreck/shared/api/invoices';
import { useSearchParams } from 'react-router';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';
import { useToday } from '@/clock/useNow';

export type InvoiceTab = 'open' | 'all';

export type InvoiceFigures = {
  /** Sent, not paid. */
  openMinor: number;
  overdueMinor: number;
  draftsMinor: number;
  /** Paid in the current year. */
  paidMinor: number;
};

export type InvoicesPage = {
  today: string;
  tab: InvoiceTab;
  /** `all` or an id. */
  customerId: string;
  data: QueryState<{
    catalog: Catalog;
    /** Invoices of the tab and filter. */
    invoices: Invoice[];
    /** Whether any Invoice exists at all. */
    any: boolean;
    openCount: number;
    figures: InvoiceFigures;
  }>;
  handleTabChange: (tab: InvoiceTab) => void;
  handleCustomerChange: (customerId: string) => void;
};

/** State of the Invoices screen; tab and Customer filter live in the URL. */
export function useInvoicesPage(): InvoicesPage {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const tab: InvoiceTab = params.get('tab') === 'all' ? 'all' : 'open';
  const customerId = params.get('customerId') ?? 'all';
  const state = combineQueries(useCatalog(), useQuery<Invoice[]>('/invoices'));

  function update(key: string, value: string | null): void {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  let data: InvoicesPage['data'];
  if (state.status !== 'ready') data = state;
  else {
    const [catalog, all] = state.data;
    const ofCustomer = all.filter(
      (i) => customerId === 'all' || String(i.customerId) === customerId,
    );
    const open = ofCustomer.filter((i) => i.status !== 'paid');
    data = {
      status: 'ready',
      data: {
        catalog,
        invoices: tab === 'open' ? open : ofCustomer,
        any: all.length > 0,
        openCount: open.length,
        figures: figures(ofCustomer, today),
      },
    };
  }

  return {
    today,
    tab,
    customerId,
    data,
    handleTabChange: (next) => update('tab', next === 'open' ? null : next),
    handleCustomerChange: (next) => update('customerId', next === 'all' ? null : next),
  };
}

function figures(invoices: Invoice[], today: string): InvoiceFigures {
  const sum = (list: Invoice[]): number => list.reduce((total, i) => total + i.totalMinor, 0);
  const sent = invoices.filter((i) => i.status === 'sent');
  return {
    openMinor: sum(sent),
    overdueMinor: sum(sent.filter((i) => i.dueDate < today)),
    draftsMinor: sum(invoices.filter((i) => i.status === 'draft')),
    paidMinor: sum(invoices.filter((i) => i.paidOn?.slice(0, 4) === today.slice(0, 4))),
  };
}
