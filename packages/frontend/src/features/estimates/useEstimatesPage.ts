import type { Estimate } from '@dreck/shared/api/estimates';
import { useSearchParams } from 'react-router';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';
import { useToday } from '@/clock/useNow';

export type EstimateTab = 'open' | 'all';

export type EstimatesPage = {
  today: string;
  tab: EstimateTab;
  /** `all` or an id. */
  customerId: string;
  data: QueryState<{
    catalog: Catalog;
    /** Estimates of the tab and filter. */
    estimates: Estimate[];
    /** Whether any Estimate exists at all. */
    any: boolean;
    openCount: number;
  }>;
  handleTabChange: (tab: EstimateTab) => void;
  handleCustomerChange: (customerId: string) => void;
};

/** State of the Estimates screen; tab and Customer filter live in the URL. */
export function useEstimatesPage(): EstimatesPage {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const tab: EstimateTab = params.get('tab') === 'all' ? 'all' : 'open';
  const customerId = params.get('customerId') ?? 'all';
  const state = combineQueries(useCatalog(), useQuery<Estimate[]>('/estimates'));

  function update(key: string, value: string | null): void {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  let data: EstimatesPage['data'];
  if (state.status !== 'ready') data = state;
  else {
    const [catalog, all] = state.data;
    const ofCustomer = all.filter(
      (e) => customerId === 'all' || String(e.customerId) === customerId,
    );
    const open = ofCustomer.filter((e) => e.status === 'draft' || e.status === 'sent');
    data = {
      status: 'ready',
      data: {
        catalog,
        estimates: tab === 'open' ? open : ofCustomer,
        any: all.length > 0,
        openCount: open.length,
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
