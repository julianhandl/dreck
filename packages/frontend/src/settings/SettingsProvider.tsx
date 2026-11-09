import type { Settings } from '@dreck/shared/api/settings';
import type { ReactElement, ReactNode } from 'react';
import { useQuery } from '@/api/useQuery';
import { SettingsContext, type SettingsState } from './settings-context';

type SettingsProviderProps = {
  /** The app, which reads the settings via `useSettings` or `useSettingsState`. */
  children: ReactNode;
};

/**
 * Loads the instance settings (after the login, if needed) and provides them; loads them
 * again after every write.
 * @example <SettingsProvider><App /></SettingsProvider>
 */
export function SettingsProvider({ children }: SettingsProviderProps): ReactElement {
  const query = useQuery<Settings>('/settings');
  return <SettingsContext value={toState(query)}>{children}</SettingsContext>;
}

function toState(query: ReturnType<typeof useQuery<Settings>>): SettingsState {
  switch (query.status) {
    case 'ready':
      return { status: 'ready', settings: query.data };
    case 'loading':
      return query;
    default:
      return { status: 'offline', retry: query.retry };
  }
}
