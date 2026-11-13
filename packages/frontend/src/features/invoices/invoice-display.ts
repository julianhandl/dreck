import type { Invoice } from '@dreck/shared/api/invoices';
import type { Language } from '@dreck/shared/i18n';
import { daysBetween } from '@/format/calendar';

/** Status as shown: a sent Invoice past its due date is `late`. */
export type DisplayStatus = Invoice['status'] | 'late';

export function displayStatus(invoice: Invoice, today: string): DisplayStatus {
  return invoice.status === 'sent' && invoice.dueDate < today ? 'late' : invoice.status;
}

/** Due date relative to today in the language, e.g. `in 17 Tagen`, `heute`, `vor 3 Tagen`. */
export function relativeDue(dueDate: string, today: string, language: Language): string {
  return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(
    daysBetween(today, dueDate),
    'day',
  );
}

/** Quantity × 100 as number in the language (`1917`, de → `19,17`). */
export function formatQuantity(quantityHundredths: number, language: Language): string {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(quantityHundredths / 100);
}
