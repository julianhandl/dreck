import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ApiError } from './api-error';

/** Maps thrown errors to the API error format. */
export function handleError(err: Error, c: Context): Response {
  const error = toApiError(err);
  if (!error && err instanceof HTTPException) return err.getResponse();
  if (!error) {
    console.error(err);
    return c.json({ code: 'internal_error', message: 'Internal server error' }, 500);
  }
  for (const [name, value] of Object.entries(error.headers ?? {})) c.header(name, value);
  return c.json(
    { code: error.code, message: error.message, ...(error.details && { details: error.details }) },
    error.status,
  );
}

function toApiError(err: Error): ApiError | undefined {
  if (err instanceof ApiError) return err;
  if (err instanceof HTTPException && err.status === 400) {
    return new ApiError('validation_failed', err.message);
  }
  switch (sqliteCode(err)) {
    case 'SQLITE_CONSTRAINT_FOREIGNKEY':
    // ON DELETE RESTRICT reports as TRIGGER; the schema has no triggers of its own
    case 'SQLITE_CONSTRAINT_TRIGGER':
      return new ApiError('has_dependencies', 'The record is still referenced by other records');
    case 'SQLITE_CONSTRAINT_UNIQUE':
      return new ApiError('name_taken', 'The name is already taken');
  }
  return undefined;
}

/** SQLite error code, also when Drizzle wraps the driver error in `cause`. */
function sqliteCode(err: unknown): string | undefined {
  for (let e = err; e instanceof Error; e = e.cause) {
    if ('code' in e && typeof e.code === 'string' && e.code.startsWith('SQLITE_')) return e.code;
  }
  return undefined;
}
