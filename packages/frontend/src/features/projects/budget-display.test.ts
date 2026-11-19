import { describe, expect, test } from 'bun:test';
import { messages } from '@dreck/shared/i18n';
import { budgetView, describeBudget } from './budget-display';

const format = {
  language: 'de',
  currency: 'EUR',
  messages: messages.de,
  today: '2026-11-15',
} as const;
const sums = (roundedSeconds: number, amountMinor = 0) => ({
  roundedSeconds,
  amountMinor,
  billableExpensesMinor: 0,
});

describe('budgetView', () => {
  test('no Budget, no view', () => {
    expect(budgetView(null, sums(1), sums(1))).toBeNull();
  });

  test('monthly Budgets use the sums of the month, others those of all time', () => {
    const hours = { type: 'hours', seconds: 3600, monthly: false } as const;
    expect(budgetView(hours, sums(1800), sums(3600))?.usage.used).toBe(1800);
    expect(budgetView({ ...hours, monthly: true }, sums(1800), sums(3600))?.usage.used).toBe(3600);
  });

  test('missing sums count as zero', () => {
    const hours = { type: 'hours', seconds: 3600, monthly: false } as const;
    expect(budgetView(hours, undefined, undefined)?.usage.used).toBe(0);
  });
});

describe('describeBudget', () => {
  const hours = { type: 'hours', seconds: 40 * 3600, monthly: false } as const;

  test('hours with decimals and remaining', () => {
    const view = budgetView(hours, sums(12.5 * 3600), undefined);
    expect(view && describeBudget(view, format)).toEqual({
      valueText: '12,5 h von 40 h',
      stateLabel: 'Im Rahmen',
      remainingText: '27,5 h übrig',
    });
  });

  test('over Budget shows the excess and the month of a monthly Budget', () => {
    const view = budgetView({ ...hours, monthly: true }, undefined, sums(43.5 * 3600));
    const text = view && describeBudget(view, format);
    expect(text?.valueText).toBe('43,5 h von 40 h im November');
    expect(text?.stateLabel).toBe('Überschritten');
    expect(text?.remainingText).toBe('+3,5 h über Budget');
  });

  test('amount as money', () => {
    const view = budgetView(
      { type: 'amount', amountMinor: 100_000, monthly: false, includeExpenses: false },
      sums(0, 85_000),
      undefined,
    );
    const text = view && describeBudget(view, format);
    expect(text?.stateLabel).toBe('Knapp');
    expect(text?.valueText).toContain('850,00');
  });
});
