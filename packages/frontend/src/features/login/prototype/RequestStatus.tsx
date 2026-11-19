import type { ReactElement } from 'react';
import { useSetupText } from './useSetupText';

type RequestStatusProps = {
  /** Seconds left from `Retry-After`; 0 = not limited. */
  limitedSeconds: number;
  /** The last 429 ran out. */
  limitOver: boolean;
  /** Confirmation after a successful request, e.g. "Der neue Link steht jetzt im Log". */
  success?: string | null;
};

/**
 * PROTOTYPE: live region for the answer to a link request: confirmation, `429` with a
 * countdown from `Retry-After`, or "jetzt noch einmal".
 * @example <RequestStatus limitedSeconds={12} limitOver={false} success={null} />
 */
export function RequestStatus({
  limitedSeconds,
  limitOver,
  success = null,
}: RequestStatusProps): ReactElement {
  const t = useSetupText();
  let text = success ?? '';
  let tone = 'text-temp-success';
  if (limitedSeconds > 0) {
    text = t.limited(limitedSeconds);
    tone = 'text-temp-danger';
  } else if (limitOver) {
    text = t.limitedOver;
    tone = 'text-temp-ink';
  }
  return (
    <p role="status" className={`empty:sr-only ${tone}`}>
      {text}
    </p>
  );
}
