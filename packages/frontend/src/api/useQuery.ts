import type { ApiErrorCode } from '@dreck/shared/api-errors';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ApiError, api, NetworkError, withQuery } from './api-client';

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'offline'; retry: () => void }
  | { status: 'error'; code: ApiErrorCode; retry: () => void }
  | { status: 'ready'; data: T };

type Query = Record<string, string | number | undefined>;

// Every successful write bumps the version; mounted queries load again and keep their data meanwhile
let version = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Loads all mounted queries again; call after a successful write. */
export function invalidateQueries(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** Version that changes with every `invalidateQueries()`. */
export function useQueryVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}

type Result<T> =
  | { url: string; data: T }
  | { url: string; offline: true }
  | { url: string; code: ApiErrorCode };

/**
 * GET request bound to the component; loads again when the URL changes or after
 * `invalidateQueries()`. Keeps the old data while a reload runs.
 */
export function useQuery<T>(path: string, query?: Query): QueryState<T> {
  const url = withQuery(path, query);
  const currentVersion = useQueryVersion();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: version and attempt trigger the reload
  useEffect(() => {
    let current = true;
    api
      .get<T>(url)
      .then((data) => current && setResult({ url, data }))
      .catch((error: unknown) => {
        if (!current) return;
        if (error instanceof NetworkError) setResult({ url, offline: true });
        else if (error instanceof ApiError) setResult({ url, code: error.code });
        else throw error;
      });
    return () => {
      current = false;
    };
  }, [url, currentVersion, attempt]);

  const retry = (): void => setAttempt((n) => n + 1);
  if (result === null || result.url !== url) return { status: 'loading' };
  if ('data' in result) return { status: 'ready', data: result.data };
  if ('code' in result) return { status: 'error', code: result.code, retry };
  return { status: 'offline', retry };
}

type Data<S> = Extract<S, { status: 'ready' }> extends { data: infer T } ? T : never;

/** Combines several queries: ready once all are ready, otherwise the first state that is not. */
export function combineQueries<const S extends readonly QueryState<unknown>[]>(
  ...states: S
): QueryState<{ [K in keyof S]: Data<S[K]> }> {
  const notReady = states.find((state) => state.status !== 'ready');
  if (notReady) return notReady as QueryState<never>;
  const data = states.map((state) => (state as { data: unknown }).data);
  return { status: 'ready', data: data as { [K in keyof S]: Data<S[K]> } };
}
