import { describe, expect, test } from 'bun:test';
import { formatPercentInput, parseDecimal, parsePercent } from './decimal';

describe('decimal', () => {
  test.each([
    ['1,5', 150],
    ['19.17', 1917],
    ['1.000', 100000],
    ['0', 0],
  ])('%p with 2 digits → %p', (input, expected) => {
    expect(parseDecimal(input, 2)).toBe(expected);
  });

  test.each(['1,5555', '-1', 'x', ''])('%p is invalid', (input) => {
    expect(parseDecimal(input, 2)).toBeNull();
  });

  test('percent: 0–100 % in basis points', () => {
    expect(parsePercent('20')).toBe(2000);
    expect(parsePercent('10,5')).toBe(1050);
    expect(parsePercent('100')).toBe(10000);
    expect(parsePercent('100,01')).toBeNull();
    expect(formatPercentInput(1050, 'de')).toBe('10,5');
    expect(formatPercentInput(2000, 'en')).toBe('20');
  });
});
