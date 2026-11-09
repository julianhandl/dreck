import type { Language, Messages } from '@dreck/shared/i18n';
import { createContext } from 'react';

export type I18n = {
  language: Language;
  messages: Messages;
};

export const I18nContext = createContext<I18n | null>(null);
