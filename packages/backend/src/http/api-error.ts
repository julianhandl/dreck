import type { ApiErrorCode } from '@dreck/shared/api-errors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const STATUS: Record<ApiErrorCode, ContentfulStatusCode> = {
  validation_failed: 400,
  unauthorized: 401,
  not_found: 404,
  has_dependencies: 409,
  name_taken: 409,
  currency_locked: 409,
  no_running_timer: 409,
  rate_limited: 429,
  internal_error: 500,
};

/** Error with a stable API code; the error handler turns it into `{ code, message, details }`. */
export class ApiError extends Error {
  readonly status: ContentfulStatusCode;

  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

/** Validation error for a single field, shaped like a Zod issue so the UI can show it at the field. */
export function fieldError(field: string, message: string): ApiError {
  return new ApiError('validation_failed', message, { issues: [{ path: [field], message }] });
}
