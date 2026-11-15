import type { Estimate } from '@dreck/shared/api/estimates';

/** Status as shown: a sent Estimate past its validity is `expired`. */
export type DisplayStatus = Estimate['status'] | 'expired';

export function displayStatus(
  estimate: Pick<Estimate, 'status' | 'validUntil'>,
  today: string,
): DisplayStatus {
  return estimate.status === 'sent' && estimate.validUntil !== null && estimate.validUntil < today
    ? 'expired'
    : estimate.status;
}
