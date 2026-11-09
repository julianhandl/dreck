import type { ErrorBody } from '@dreck/shared/api/common';
import type { ApiErrorCode } from '@dreck/shared/api-errors';
import { waitForLogin } from './login-gate';

/** The request reached the server, which answered with an error body. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details: Record<string, unknown>;

  constructor({ code, message, details }: ErrorBody) {
    super(message);
    this.code = code;
    this.details = details ?? {};
  }
}

/** The request did not reach the server; nothing was saved. */
export class NetworkError extends Error {}

type RequestOptions = {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

/**
 * Calls `/api/v1`. A 401 opens the login dialog and repeats the same call afterwards.
 * Throws `NetworkError` without a connection and `ApiError` for error responses.
 */
async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = withQuery(`/api/v1${path}`, options.query);
  const init: RequestInit = { method };
  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }

  let response = await send(url, init);
  if (response.status === 401 && path !== '/auth/login') {
    await waitForLogin();
    response = await send(url, init);
  }
  if (!response.ok) throw new ApiError(await errorBody(response));
  if (response.status === 204) return undefined as T;
  // Unchecked: the server builds its responses from the same shared schemas
  return (await response.json()) as T;
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new NetworkError('No connection', { cause });
  }
}

/** Appends the defined query values to a path (`/reports` → `/reports?from=…`). */
export function withQuery(url: string, query: RequestOptions['query'] = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.size > 0 ? `${url}?${params}` : url;
}

// A proxy in front of the app can answer without the JSON error body
async function errorBody(response: Response): Promise<ErrorBody> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === 'object' && body !== null && 'code' in body) return body as ErrorBody;
  return { code: 'internal_error', message: `${response.status} ${response.statusText}` };
}

/** Typed calls to the Dreck API; types come from `@dreck/shared/api/*`. */
export const api = {
  get: <T>(path: string, query?: RequestOptions['query']): Promise<T> =>
    request<T>('GET', path, { query }),
  post: <T = void>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, { body }),
  patch: <T>(path: string, body: unknown): Promise<T> => request<T>('PATCH', path, { body }),
  delete: (path: string): Promise<void> => request<void>('DELETE', path),
};
