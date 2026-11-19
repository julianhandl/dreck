import type { Budget } from '@dreck/shared/api/projects';
import { type BudgetSums, type BudgetUsage, budgetUsage } from '@dreck/shared/budget';
import type { Language, Messages } from '@dreck/shared/i18n';
import { formatDate } from '@/format/date';
import { formatMoney } from '@/format/money';

const NO_SUMS: BudgetSums = { roundedSeconds: 0, amountMinor: 0, billableExpensesMinor: 0 };

/** Budget of a Project with its consumption. */
export type BudgetView = { budget: Budget; usage: BudgetUsage };

/** Consumption of a Budget from the sums of all time or, for a monthly one, of the current month. */
export function budgetView(
  budget: Budget | null,
  allTime: BudgetSums | undefined,
  month: BudgetSums | undefined,
): BudgetView | null {
  if (!budget) return null;
  const sums = (budget.monthly ? month : allTime) ?? NO_SUMS;
  return { budget, usage: budgetUsage(budget, sums) };
}

type Format = { language: Language; currency: string; messages: Messages; today: string };

/** Texts of a Budget for bar and key figure. */
export type BudgetText = {
  /** "12,5 h von 40 h", monthly with "im November". */
  valueText: string;
  /** "Im Rahmen", "Knapp" or "Überschritten". */
  stateLabel: string;
  /** "27,5 h übrig" or "+3,5 h über Budget". */
  remainingText: string;
};

/** Hours with up to two decimals in the language: 45000 s → `12,5 h`. */
function formatHours(seconds: number, language: Language): string {
  const value = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(
    seconds / 3600,
  );
  return `${value} h`;
}

/** Texts of a Budget view; `today` names the month of a monthly Budget. */
export function describeBudget(
  { budget, usage }: BudgetView,
  { language, currency, messages, today }: Format,
): BudgetText {
  const t = messages.budget;
  const show = (value: number): string =>
    budget.type === 'hours' ? formatHours(value, language) : formatMoney(value, currency, language);
  const month = formatDate(today, language, { month: 'long' });
  const valueText = t.usedOf(show(usage.used), show(usage.limit));
  return {
    valueText: budget.monthly ? t.inMonth(valueText, month) : valueText,
    stateLabel: t.states[usage.state],
    remainingText:
      usage.remaining >= 0 ? t.remaining(show(usage.remaining)) : t.overBy(show(-usage.remaining)),
  };
}
