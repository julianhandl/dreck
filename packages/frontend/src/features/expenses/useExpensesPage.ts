import type { Expense } from '@dreck/shared/api/expenses';
import { useState } from 'react';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';
import { useToday } from '@/clock/useNow';
import { addDays, startOfWeek } from '@/format/calendar';

export type ExpenseWeek = { from: string; to: string; expenses: Expense[]; totalMinor: number };

/** `new` = form above the list, a number = this Expense is edited in place. */
export type Editing = 'new' | number | null;

export type ExpensesPage = {
  today: string;
  data: QueryState<{ catalog: Catalog; expenses: Expense[]; weeks: ExpenseWeek[] }>;
  editing: Editing;
  handleEdit: (editing: Editing) => void;
};

/** State of the Expenses screen: all Expenses grouped by week and the open form. */
export function useExpensesPage(): ExpensesPage {
  const today = useToday();
  const [editing, setEditing] = useState<Editing>(null);
  const state = combineQueries(useCatalog(), useQuery<Expense[]>('/expenses'));

  return {
    today,
    data:
      state.status === 'ready'
        ? {
            status: 'ready',
            data: { catalog: state.data[0], expenses: state.data[1], weeks: byWeek(state.data[1]) },
          }
        : state,
    editing,
    handleEdit: setEditing,
  };
}

// The API sorts by date descending, so the weeks come out newest first
function byWeek(expenses: Expense[]): ExpenseWeek[] {
  const weeks = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const from = startOfWeek(expense.date);
    weeks.set(from, [...(weeks.get(from) ?? []), expense]);
  }
  return [...weeks].map(([from, list]) => ({
    from,
    to: addDays(from, 6),
    expenses: list,
    totalMinor: list.reduce((sum, e) => sum + e.amountMinor, 0),
  }));
}
