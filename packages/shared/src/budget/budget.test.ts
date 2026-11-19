import { describe, expect, test } from 'bun:test';
import { type BudgetLimit, budgetUsage } from './budget';

const hours = (seconds: number): BudgetLimit => ({ type: 'hours', seconds, monthly: false });
const amount = (amountMinor: number, includeExpenses = false): BudgetLimit => ({
  type: 'amount',
  amountMinor,
  monthly: false,
  includeExpenses,
});
const sums = (roundedSeconds: number, amountMinor = 0, billableExpensesMinor = 0) => ({
  roundedSeconds,
  amountMinor,
  billableExpensesMinor,
});

describe('budgetUsage', () => {
  test('hours count all rounded seconds and ignore amounts', () => {
    expect(budgetUsage(hours(40 * 3600), sums(12.5 * 3600, 99_999))).toEqual({
      used: 45_000,
      limit: 144_000,
      remaining: 99_000,
      ratio: 45_000 / 144_000,
      state: 'ok',
    });
  });

  test('amount counts the billable amount without Expenses by default', () => {
    expect(budgetUsage(amount(1000), sums(0, 300, 200))).toMatchObject({
      used: 300,
      remaining: 700,
    });
  });

  test('amount with includeExpenses adds the billable Expenses', () => {
    expect(budgetUsage(amount(1000, true), sums(0, 300, 200))).toMatchObject({
      used: 500,
      remaining: 500,
    });
  });

  test('states at the thresholds', () => {
    const state = (used: number): string => budgetUsage(hours(1000), sums(used)).state;
    expect(state(0)).toBe('ok');
    expect(state(799)).toBe('ok');
    expect(state(800)).toBe('warning');
    expect(state(1000)).toBe('warning');
    expect(state(1001)).toBe('over');
  });

  test('remaining is negative when over', () => {
    expect(budgetUsage(hours(3600), sums(5400))).toMatchObject({ remaining: -1800, state: 'over' });
  });
});
