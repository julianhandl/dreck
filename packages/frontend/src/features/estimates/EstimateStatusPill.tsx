import type { ReactElement } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { Pill } from '@/ui/Pill';
import type { DisplayStatus } from './estimate-display';

const TONE = {
  draft: 'default',
  sent: 'accent',
  accepted: 'success',
  declined: 'default',
  expired: 'danger',
} as const;

type EstimateStatusPillProps = {
  /** Status including `expired`, see `displayStatus`. */
  status: DisplayStatus;
};

/**
 * Status of an Estimate as coloured pill: Entwurf, Gesendet, Angenommen, Abgelehnt or Abgelaufen.
 * @example <EstimateStatusPill status={displayStatus(estimate, today)} />
 */
export function EstimateStatusPill({ status }: EstimateStatusPillProps): ReactElement {
  const { messages } = useI18n();
  return <Pill tone={TONE[status]}>{messages.estimates.status[status]}</Pill>;
}
