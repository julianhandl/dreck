// Hours optional, minutes optional but two digits: `2:30`, `0:45`, `2`, `:45`
const DURATION = /^(\d+)?(?::([0-5]\d))?$/;

/** Duration as `h:mm`, minutes cut off (3599 s → `0:59`). */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Parses `h:mm` (`2` = 2:00, `:45` = 0:45) into seconds; anything else is `null`. */
export function parseDuration(input: string): number | null {
  const match = DURATION.exec(input.trim());
  const [, hours, minutes] = match ?? [];
  if (hours === undefined && minutes === undefined) return null;
  return (Number(hours ?? 0) * 60 + Number(minutes ?? 0)) * 60;
}
