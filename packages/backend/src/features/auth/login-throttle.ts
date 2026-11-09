const WINDOW_MS = 60_000;
const MAX_FAILURES = 10;

export type LoginThrottle = {
  /** Seconds until the next attempt is allowed; 0 if not blocked. */
  retryAfterSeconds: () => number;
  recordFailure: () => void;
};

/**
 * Global brake for failed passwords and Bearer tokens, counted in memory: from 10 failures per
 * minute every attempt is blocked. Expired failures drop out on the next failure, no timer.
 */
export function createLoginThrottle(): LoginThrottle {
  let failures: number[] = [];
  const recent = (): number[] => failures.filter((t) => t > Date.now() - WINDOW_MS);

  return {
    retryAfterSeconds: () => {
      const active = recent();
      const oldest = active[0];
      if (active.length < MAX_FAILURES || oldest === undefined) return 0;
      return Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000));
    },
    recordFailure: () => {
      failures = [...recent(), Date.now()];
    },
  };
}
