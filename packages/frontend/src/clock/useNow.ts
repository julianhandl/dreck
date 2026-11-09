import { dateInTimeZone } from '@dreck/shared/time';
import { useEffect, useState } from 'react';
import { useSettings } from '@/settings/useSettings';

/** Current time in ms; ticks every `intervalMs` while `active`, e.g. for a running timer. */
export function useNow(active = true, intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

/** Today (`YYYY-MM-DD`) in the time zone of the instance; updates at midnight within a minute. */
export function useToday(): string {
  const { timezone } = useSettings();
  return dateInTimeZone(useNow(true, 60_000), timezone);
}

/** Seconds of a Time Entry including the running part. */
export function elapsedSeconds(
  entry: { durationSeconds: number; runningSince: string | null },
  now: number,
): number {
  if (entry.runningSince === null) return entry.durationSeconds;
  return (
    entry.durationSeconds + Math.max(0, Math.floor((now - Date.parse(entry.runningSince)) / 1000))
  );
}
