import { messages } from '@dreck/shared/i18n';
import { type ReactElement, type ReactNode, useEffect, useMemo } from 'react';
import { useSettingsState } from '@/settings/useSettings';
import { browserLanguage } from './browser-language';
import { I18nContext } from './i18n-context';

type I18nProviderProps = {
  /** The app, which reads the messages via `useI18n`. */
  children: ReactNode;
};

/**
 * Provides `settings.language` and its messages; before the settings are loaded (login)
 * the browser language. Keeps `<html lang>` in sync.
 * @example <SettingsProvider><I18nProvider><App /></I18nProvider></SettingsProvider>
 */
export function I18nProvider({ children }: I18nProviderProps): ReactElement {
  const state = useSettingsState();
  const language = state.status === 'ready' ? state.settings.language : browserLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({ language, messages: messages[language] }), [language]);
  return <I18nContext value={value}>{children}</I18nContext>;
}
