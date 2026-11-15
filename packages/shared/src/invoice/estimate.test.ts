import { describe, expect, test } from 'bun:test';
import { estimateStatus } from './estimate';

describe('estimateStatus', () => {
  const d = '2026-11-01';
  test.each([
    [null, null, null, 'draft'],
    [d, null, null, 'sent'],
    [null, d, null, 'accepted'],
    [d, d, null, 'accepted'],
    [null, null, d, 'declined'],
    [d, null, d, 'declined'],
    [d, d, d, 'accepted'],
    [null, d, d, 'accepted'],
  ] as const)('sentOn %p, acceptedOn %p, declinedOn %p → %p', (s, a, dec, expected) => {
    expect(estimateStatus(s, a, dec)).toBe(expected);
  });
});
