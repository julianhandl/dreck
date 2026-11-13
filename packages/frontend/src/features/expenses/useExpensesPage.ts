import type { Expense } from '@dreck/shared/api/expenses';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';
import { useToday } from '@/clock/useNow';

/** `month` as `YYYY-MM`. */
export type ExpenseMonth = { month: string; expenses: Expense[]; totalMinor: number };

/** `new` = form above the list, a number = this Expense is edited in place. */
export type Editing = 'new' | number | null;

export const BILLABLE_FILTERS = ['all', 'billable', 'notBillable'] as const;
export type BillableFilter = (typeof BILLABLE_FILTERS)[number];

export type ExpensesPage = {
  today: string;
  data: QueryState<{
    catalog: Catalog;
    /** All Expenses, unfiltered, for the form's defaults. */
    expenses: Expense[];
    /** Filtered Expenses by calendar month. */
    months: ExpenseMonth[];
  }>;
  editing: Editing;
  /** `all` or an id. */
  customerId: string;
  /** `all` or an id. */
  projectId: string;
  billable: BillableFilter;
  filtered: boolean;
  handleEdit: (editing: Editing) => void;
  handleCustomerChange: (customerId: string) => void;
  handleProjectChange: (projectId: string) => void;
  handleBillableChange: (billable: BillableFilter) => void;
  handleClearFilters: () => void;
};

/** State of the Expenses screen: Expenses grouped by month, the open form; filters live in the URL. */
export function useExpensesPage(): ExpensesPage {
  const today = useToday();
  const [editing, setEditing] = useState<Editing>(null);
  const [params, setParams] = useSearchParams();
  const customerId = params.get('customerId') ?? 'all';
  const projectId = params.get('projectId') ?? 'all';
  const billable = BILLABLE_FILTERS.find((b) => b === params.get('billable')) ?? 'all';
  const state = combineQueries(useCatalog(), useQuery<Expense[]>('/expenses'));

  function update(changes: Record<string, string | null>): void {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  }

  let data: ExpensesPage['data'];
  if (state.status !== 'ready') data = state;
  else {
    const [catalog, expenses] = state.data;
    const matches = (expense: Expense): boolean => {
      const project = catalog.project(expense.projectId);
      return (
        (customerId === 'all' || String(project?.customerId) === customerId) &&
        (projectId === 'all' || String(expense.projectId) === projectId) &&
        (billable === 'all' || expense.billable === (billable === 'billable'))
      );
    };
    data = {
      status: 'ready',
      data: { catalog, expenses, months: byMonth(expenses.filter(matches)) },
    };
  }

  return {
    today,
    data,
    editing,
    customerId,
    projectId,
    billable,
    filtered: customerId !== 'all' || projectId !== 'all' || billable !== 'all',
    handleEdit: setEditing,
    handleCustomerChange: (next) =>
      update({ customerId: next === 'all' ? null : next, projectId: null }),
    handleProjectChange: (next) => update({ projectId: next === 'all' ? null : next }),
    handleBillableChange: (next) => update({ billable: next === 'all' ? null : next }),
    handleClearFilters: () => update({ customerId: null, projectId: null, billable: null }),
  };
}

// The API sorts by date descending, so the months come out newest first
function byMonth(expenses: Expense[]): ExpenseMonth[] {
  const months = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const month = expense.date.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), expense]);
  }
  return [...months].map(([month, list]) => ({
    month,
    expenses: list,
    totalMinor: list.reduce((sum, e) => sum + e.amountMinor, 0),
  }));
}
