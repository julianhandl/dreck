import { useSyncExternalStore } from 'react';

// Requests that got a 401 wait on this promise until the login dialog succeeds
let pending: PromiseWithResolvers<void> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Opens the login dialog (once for all waiting requests) and resolves after the login. */
export function waitForLogin(): Promise<void> {
  if (!pending) {
    pending = Promise.withResolvers();
    notify();
  }
  return pending.promise;
}

/** Closes the login dialog and lets the waiting requests run again. */
export function completeLogin(): void {
  pending?.resolve();
  pending = null;
  notify();
}

/** Whether a request waits for the login. */
export function useLoginRequired(): boolean {
  return useSyncExternalStore(subscribe, () => pending !== null);
}
