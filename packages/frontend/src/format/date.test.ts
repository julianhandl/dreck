import { expect, test } from 'bun:test';
import { formatDate } from './date';

test('formats a date in the language, independent of the local time zone', () => {
  expect(formatDate('2026-11-10', 'de')).toBe('10.11.2026');
  expect(formatDate('2026-11-10', 'en')).toBe('Nov 10, 2026');
  expect(formatDate('2026-01-01', 'de', { weekday: 'long', day: 'numeric', month: 'long' })).toBe(
    'Donnerstag, 1. Januar',
  );
});
