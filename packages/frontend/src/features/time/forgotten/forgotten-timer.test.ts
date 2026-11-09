import { describe, expect, test } from 'bun:test';
import { isForgotten } from './forgotten-timer';

describe('isForgotten', () => {
  const now = Date.parse('2026-11-12T17:00:00Z'); // 18:00 in Vienna

  test('a timer of this morning is not forgotten', () => {
    expect(isForgotten('2026-11-12T08:00:00Z', now, 'Europe/Vienna')).toBe(false);
  });

  test('exactly 10 h is not forgotten yet, a second more is', () => {
    expect(isForgotten('2026-11-12T07:00:00Z', now, 'Europe/Vienna')).toBe(false);
    expect(isForgotten('2026-11-12T06:59:59Z', now, 'Europe/Vienna')).toBe(true);
  });

  test('a timer of an earlier day is forgotten even after a few minutes', () => {
    // 23:55 yesterday in Vienna, now 00:05 today
    const justAfterMidnight = Date.parse('2026-11-12T23:05:00Z');
    expect(isForgotten('2026-11-12T22:55:00Z', justAfterMidnight, 'Europe/Vienna')).toBe(true);
  });

  test('the day counts in the instance time zone, not in UTC', () => {
    // 23:30 UTC is already the next day in Vienna, but the same day in UTC
    const late = Date.parse('2026-11-12T23:30:00Z');
    expect(isForgotten('2026-11-12T22:30:00Z', late, 'UTC')).toBe(false);
    expect(isForgotten('2026-11-12T22:30:00Z', late, 'Europe/Vienna')).toBe(true);
  });
});
