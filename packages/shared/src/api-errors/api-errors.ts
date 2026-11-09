/** Stable, English error codes of the API. The UI translates them via the i18n messages. */
export const API_ERROR_CODES = [
  'validation_failed',
  'unauthorized',
  'not_found',
  'has_dependencies',
  'name_taken',
  'currency_locked',
  'no_running_timer',
  'rate_limited',
  'internal_error',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
