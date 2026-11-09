import type { Settings } from '@dreck/shared/api/settings';
import { createContext } from 'react';

export type SettingsState =
  | { status: 'loading' }
  | { status: 'offline'; retry: () => void }
  | { status: 'ready'; settings: Settings };

export const SettingsContext = createContext<SettingsState | null>(null);
