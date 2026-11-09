import { LANGUAGES, type Language } from '@dreck/shared/i18n';

/** Language of the browser if Dreck has it, otherwise English. */
export function browserLanguage(): Language {
  return LANGUAGES.find((language) => navigator.language.startsWith(language)) ?? 'en';
}
