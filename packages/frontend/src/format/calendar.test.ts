import { describe, expect, test } from 'bun:test';
import { addDays, periodRange, shiftPeriod, startOfWeek, weekDates } from './calendar';

describe('calendar', () => {
  test('addDays crosses months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('startOfWeek is the Monday', () => {
    expect(startOfWeek('2026-11-10')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09');
  });

  test('weekDates runs Monday to Sunday', () => {
    expect(weekDates('2026-11-10')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
  });

  test('periodRange', () => {
    expect(periodRange('week', '2026-11-10')).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    expect(periodRange('month', '2024-02-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(periodRange('quarter', '2026-11-10')).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    expect(periodRange('year', '2026-11-10')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  test('shiftPeriod', () => {
    expect(shiftPeriod('month', '2026-01-01', -1)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
    expect(shiftPeriod('quarter', '2026-10-01', 1)).toEqual({
      from: '2027-01-01',
      to: '2027-03-31',
    });
    expect(shiftPeriod('week', '2026-11-09', 1)).toEqual({ from: '2026-11-16', to: '2026-11-22' });
  });
});
