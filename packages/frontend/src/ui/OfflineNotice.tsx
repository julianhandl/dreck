import type { ReactElement } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { Button } from './Button';

type OfflineNoticeProps = {
  /** What happened, e.g. "Keine Verbindung, nichts gespeichert." */
  message: string;
  /** Repeats the failed call; there is no automatic retry. */
  onRetry: () => void;
};

/**
 * Message for a call without connection, with the button "Erneut versuchen".
 * @example <OfflineNotice message={messages.connection.offline} onRetry={retry} />
 */
export function OfflineNotice({ message, onRetry }: OfflineNoticeProps): ReactElement {
  const { messages } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p>{message}</p>
      <Button onClick={onRetry}>{messages.connection.retry}</Button>
    </div>
  );
}
