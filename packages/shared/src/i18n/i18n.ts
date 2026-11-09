import { de, type Messages } from './de';
import { en } from './en';

export type { Messages };

/** Languages of the UI and the CSV export. */
export const LANGUAGES = ['de', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

/** Messages per language. */
export const messages: Record<Language, Messages> = { de, en };
