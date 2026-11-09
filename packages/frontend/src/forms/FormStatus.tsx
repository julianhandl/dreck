import type { ReactElement } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { OfflineNotice } from '@/ui/OfflineNotice';
import type { Submit } from './useSubmit';

type FormStatusProps = {
  /** State from `useSubmit`. */
  submit: Pick<Submit<never>, 'offline' | 'formError' | 'handleRetry'>;
};

/**
 * Error of the form that belongs to no field, or "Keine Verbindung" with retry. The alert
 * container stays in the DOM so screen readers announce new messages.
 * @example <FormStatus submit={submit} />
 */
export function FormStatus({ submit }: FormStatusProps): ReactElement {
  const { messages } = useI18n();
  return (
    // Empty: out of the flow, so it adds no gap in flex/grid forms; stays a live region
    <div role="alert" className="empty:sr-only">
      {submit.offline && (
        <OfflineNotice message={messages.connection.nothingSaved} onRetry={submit.handleRetry} />
      )}
      {!submit.offline && submit.formError && (
        <p className="text-temp-danger">{submit.formError}</p>
      )}
    </div>
  );
}
