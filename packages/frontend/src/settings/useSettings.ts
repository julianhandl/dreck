import type { Settings } from '@dreck/shared/api/settings';
import { useContext } from 'react';
import { SettingsContext, type SettingsState } from './settings-context';

/** Loading state of the settings from the nearest `SettingsProvider`. */
export function useSettingsState(): SettingsState {
  const state = useContext(SettingsContext);
  if (!state) throw new Error('useSettingsState must be used inside SettingsProvider');
  return state;
}

/** The loaded settings; pages render only once they are there. */
export function useSettings(): Settings {
  const state = useSettingsState();
  if (state.status !== 'ready') throw new Error('useSettings needs loaded settings');
  return state.settings;
}
