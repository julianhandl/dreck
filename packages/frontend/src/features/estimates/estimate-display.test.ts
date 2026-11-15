import { describe, expect, test } from 'bun:test';
import { displayStatus } from './estimate-display';

describe('displayStatus', () => {
  const today = '2026-11-15';
  test.each([
    ['sent', '2026-11-14', 'expired'],
    ['sent', '2026-11-15', 'sent'],
    ['sent', '2026-11-16', 'sent'],
    ['sent', null, 'sent'],
    ['draft', '2026-11-01', 'draft'],
    ['accepted', '2026-11-01', 'accepted'],
    ['declined', '2026-11-01', 'declined'],
  ] as const)('%s, validUntil %p → %s', (status, validUntil, expected) => {
    expect(displayStatus({ status, validUntil }, today)).toBe(expected);
  });
});
