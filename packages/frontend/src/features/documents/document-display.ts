import type { Language } from '@dreck/shared/i18n';

/** Quantity × 100 as number in the language (`1917`, de → `19,17`). */
export function formatQuantity(quantityHundredths: number, language: Language): string {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(quantityHundredths / 100);
}
