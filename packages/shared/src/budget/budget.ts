/** From this share of the limit on a Budget counts as `warning`. */
export const BUDGET_WARNING_RATIO = 0.8;

/** A Budget of a Project in seconds or minor units; `monthly` counts per calendar month. */
export type BudgetLimit =
  | { type: 'hours'; seconds: number; monthly: boolean }
  | { type: 'amount'; amountMinor: number; monthly: boolean; includeExpenses: boolean };

/** Sums of a Project from the Report, over the period of the Budget. */
export type BudgetSums = {
  roundedSeconds: number;
  amountMinor: number;
  billableExpensesMinor: number;
};

export type BudgetState = 'ok' | 'warning' | 'over';

/** Consumption of a Budget in seconds (`hours`) or minor units (`amount`). */
export type BudgetUsage = {
  used: number;
  limit: number;
  /** Negative when `over`. */
  remaining: number;
  /** `used / limit`, 1 = exactly used up. */
  ratio: number;
  state: BudgetState;
};

/**
 * Consumption of a Budget: hours count all rounded hours, amount the billable amount plus,
 * with `includeExpenses`, the billable Expenses. Below 80 % `ok`, from 80 % `warning`,
 * above 100 % `over` (exactly 100 % is `warning`).
 */
export function budgetUsage(budget: BudgetLimit, sums: BudgetSums): BudgetUsage {
  const limit = budget.type === 'hours' ? budget.seconds : budget.amountMinor;
  const used =
    budget.type === 'hours'
      ? sums.roundedSeconds
      : sums.amountMinor + (budget.includeExpenses ? sums.billableExpensesMinor : 0);
  const ratio = used / limit;
  const state: BudgetState = ratio > 1 ? 'over' : ratio >= BUDGET_WARNING_RATIO ? 'warning' : 'ok';
  return { used, limit, remaining: limit - used, ratio, state };
}
