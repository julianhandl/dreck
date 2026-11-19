import { useToday } from '@/clock/useNow';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { type BudgetText, type BudgetView, describeBudget } from './budget-display';

/** Function that turns a Budget view into texts in the language and currency of the instance. */
export function useBudgetText(): (view: BudgetView) => BudgetText {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const today = useToday();
  return (view) => describeBudget(view, { language, currency, messages, today });
}
