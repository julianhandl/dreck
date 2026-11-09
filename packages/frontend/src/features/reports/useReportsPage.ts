import type { Report } from '@dreck/shared/api/reports';
import { useSearchParams } from 'react-router';
import { withQuery } from '@/api/api-client';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';
import { useToday } from '@/clock/useNow';
import {
  addDays,
  type DateRange,
  PERIODS,
  type Period,
  periodRange,
  shiftPeriod,
} from '@/format/calendar';

export type PeriodChoice = Period | 'custom';

export type ReportsPage = {
  period: PeriodChoice;
  range: DateRange;
  /** The range contains today. */
  current: boolean;
  /** `all` or an id. */
  customerId: string;
  projectId: string;
  data: QueryState<{ catalog: Catalog; report: Report }>;
  /** Download link of the CSV with the same filters. */
  csvUrl: string;
  handlePeriodChange: (period: PeriodChoice) => void;
  handleShift: (step: -1 | 1) => void;
  handleRangeChange: (range: DateRange) => void;
  handleCustomerChange: (customerId: string) => void;
  handleProjectChange: (projectId: string) => void;
  handleClearFilters: () => void;
};

/** State of the Report screen; period and filters live in the URL. */
export function useReportsPage(): ReportsPage {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const periodParam = params.get('period');
  const period: PeriodChoice =
    periodParam === 'custom' || PERIODS.includes(periodParam as Period)
      ? (periodParam as PeriodChoice)
      : 'month';
  const from = params.get('from') ?? today;
  const range =
    period === 'custom' ? { from, to: params.get('to') ?? from } : periodRange(period, from);
  const customerId = params.get('customerId') ?? 'all';
  const projectId = params.get('projectId') ?? 'all';
  const filters = {
    ...range,
    customerId: customerId === 'all' ? undefined : customerId,
    projectId: projectId === 'all' ? undefined : projectId,
  };

  const state = combineQueries(useCatalog(), useQuery<Report>('/reports', filters));

  function update(changes: Record<string, string | null>): void {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  return {
    period,
    range,
    current: range.from <= today && today <= range.to,
    customerId,
    projectId,
    data:
      state.status === 'ready'
        ? { status: 'ready', data: { catalog: state.data[0], report: state.data[1] } }
        : state,
    csvUrl: withQuery('/api/v1/reports', { ...filters, format: 'csv' }),
    handlePeriodChange: (next) =>
      update(
        next === 'custom'
          ? { period: next, from: range.from, to: range.to }
          : { period: next, from: today, to: null },
      ),
    handleShift: (step) => {
      if (period !== 'custom') {
        update({ from: shiftPeriod(period, range.from, step).from });
        return;
      }
      const days = (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000 + 1;
      update({ from: addDays(range.from, step * days), to: addDays(range.to, step * days) });
    },
    handleRangeChange: (next) => update({ from: next.from, to: next.to }),
    handleCustomerChange: (next) =>
      update({ customerId: next === 'all' ? null : next, projectId: null }),
    handleProjectChange: (next) => update({ projectId: next === 'all' ? null : next }),
    handleClearFilters: () => update({ customerId: null, projectId: null }),
  };
}
