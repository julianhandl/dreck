import { useContext } from 'react';
import { type I18n, I18nContext } from './i18n-context';

/** Active language and messages from the nearest `I18nProvider`. */
export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n must be used inside I18nProvider');
  return i18n;
}
