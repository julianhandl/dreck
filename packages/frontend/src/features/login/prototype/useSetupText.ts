import { useI18n } from '@/i18n/useI18n';
import { type SetupMessages, setupMessages } from './setup-recovery.messages';

/** PROTOTYPE: setup/recovery texts in the active language of the nearest `I18nContext`. */
export function useSetupText(): SetupMessages {
  return setupMessages[useI18n().language];
}
