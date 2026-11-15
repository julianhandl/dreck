/** Lifecycle of an Estimate; Expired is not a status but a sent Estimate past its validity. */
export const ESTIMATE_STATUSES = ['draft', 'sent', 'accepted', 'declined'] as const;

export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

/** Status from the dates: accepted wins over declined, declined over sent; without any it is a draft. */
export function estimateStatus(
  sentOn: string | null,
  acceptedOn: string | null,
  declinedOn: string | null,
): EstimateStatus {
  if (acceptedOn !== null) return 'accepted';
  if (declinedOn !== null) return 'declined';
  return sentOn !== null ? 'sent' : 'draft';
}
