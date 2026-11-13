import type { ReactElement } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { Pill } from '@/ui/Pill';
import type { DisplayStatus } from './invoice-display';

const TONE = { draft: 'default', sent: 'accent', paid: 'success', late: 'danger' } as const;

type InvoiceStatusPillProps = {
  /** Status including `late`, see `displayStatus`. */
  status: DisplayStatus;
};

/**
 * Status of an Invoice as coloured pill: Entwurf, Gesendet, Bezahlt or Überfällig.
 * @example <InvoiceStatusPill status={displayStatus(invoice, today)} />
 */
export function InvoiceStatusPill({ status }: InvoiceStatusPillProps): ReactElement {
  const { messages } = useI18n();
  return <Pill tone={TONE[status]}>{messages.invoices.status[status]}</Pill>;
}
