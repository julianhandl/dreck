import { describe, expect, test } from 'bun:test';
import { dateInTimeZone, instantInTimeZone, timeInTimeZone } from './time';

describe('dateInTimeZone', () => {
  const lateEveningUtc = Date.parse('2026-03-01T23:30:00Z');

  test('UTC', () => {
    expect(dateInTimeZone(lateEveningUtc, 'UTC')).toBe('2026-03-01');
  });

  test('east of UTC is already the next day', () => {
    expect(dateInTimeZone(lateEveningUtc, 'Europe/Vienna')).toBe('2026-03-02');
  });

  test('west of UTC is still the same day', () => {
    expect(dateInTimeZone(Date.parse('2026-03-02T03:00:00Z'), 'America/New_York')).toBe(
      '2026-03-01',
    );
  });

  test('daylight saving time', () => {
    // Vienna is UTC+2 in summer
    expect(dateInTimeZone(Date.parse('2026-07-01T22:30:00Z'), 'Europe/Vienna')).toBe('2026-07-02');
  });
});

describe('timeInTimeZone', () => {
  test('24-hour clock in the zone', () => {
    expect(timeInTimeZone(Date.parse('2026-03-01T23:05:00Z'), 'Europe/Vienna')).toBe('00:05');
    expect(timeInTimeZone(Date.parse('2026-07-01T13:30:59Z'), 'Europe/Vienna')).toBe('15:30');
  });
});

describe('instantInTimeZone', () => {
  const iso = (date: string, time: string, zone: string): string =>
    new Date(instantInTimeZone(date, time, zone)).toISOString();

  test('UTC', () => {
    expect(iso('2026-03-01', '09:15', 'UTC')).toBe('2026-03-01T09:15:00.000Z');
  });

  test('winter and summer time', () => {
    expect(iso('2026-01-15', '18:00', 'Europe/Vienna')).toBe('2026-01-15T17:00:00.000Z');
    expect(iso('2026-07-15', '18:00', 'Europe/Vienna')).toBe('2026-07-15T16:00:00.000Z');
  });

  test('west of UTC crosses into the next UTC day', () => {
    expect(iso('2026-01-15', '22:00', 'America/New_York')).toBe('2026-01-16T03:00:00.000Z');
  });

  test('around the switch to summer time', () => {
    // Vienna jumps from 02:00 to 03:00 on 2026-03-29
    expect(iso('2026-03-29', '01:30', 'Europe/Vienna')).toBe('2026-03-29T00:30:00.000Z');
    expect(iso('2026-03-29', '03:30', 'Europe/Vienna')).toBe('2026-03-29T01:30:00.000Z');
    // Skipped, lands an hour later
    expect(iso('2026-03-29', '02:30', 'Europe/Vienna')).toBe('2026-03-29T01:30:00.000Z');
  });

  test('around the switch back to winter time', () => {
    // Vienna repeats 02:00 to 03:00 on 2026-10-25
    expect(iso('2026-10-25', '01:30', 'Europe/Vienna')).toBe('2026-10-24T23:30:00.000Z');
    expect(iso('2026-10-25', '02:30', 'Europe/Vienna')).toBe('2026-10-25T01:30:00.000Z');
    expect(iso('2026-10-25', '03:30', 'Europe/Vienna')).toBe('2026-10-25T02:30:00.000Z');
  });

  test('round trip with dateInTimeZone and timeInTimeZone', () => {
    const at = instantInTimeZone('2026-11-12', '07:45', 'Asia/Kolkata');
    expect(dateInTimeZone(at, 'Asia/Kolkata')).toBe('2026-11-12');
    expect(timeInTimeZone(at, 'Asia/Kolkata')).toBe('07:45');
  });
});
