import { describe, expect, test } from 'bun:test';
import { amountMinor, roundSeconds } from './report';

describe('roundSeconds', () => {
  test('0 keeps the exact duration', () => {
    expect(roundSeconds(421, 0)).toBe(421);
  });

  test('rounds each entry up to the step', () => {
    expect(roundSeconds(7 * 60, 15)).toBe(15 * 60);
    expect(3 * roundSeconds(7 * 60, 15)).toBe(45 * 60);
    expect(roundSeconds(7 * 60 + 1, 6)).toBe(12 * 60);
  });

  test('ignores seconds of a started minute', () => {
    expect(roundSeconds(15 * 60 + 59, 15)).toBe(15 * 60);
    expect(roundSeconds(16 * 60, 15)).toBe(30 * 60);
    expect(roundSeconds(59, 15)).toBe(0);
  });

  test('keeps exact multiples and zero', () => {
    expect(roundSeconds(30 * 60, 15)).toBe(30 * 60);
    expect(roundSeconds(0, 60)).toBe(0);
  });
});

describe('amountMinor', () => {
  test('rate × hours', () => {
    expect(amountMinor(9000, 3600)).toBe(9000);
    expect(amountMinor(9000, 1800)).toBe(4500);
  });

  test('rounds half up to the minor unit', () => {
    // 100 × 18 / 3600 = 0.5 → 1
    expect(amountMinor(100, 18)).toBe(1);
    // 100 × 17 / 3600 = 0.47 → 0
    expect(amountMinor(100, 17)).toBe(0);
  });

  test('zero rate', () => {
    expect(amountMinor(0, 3600)).toBe(0);
  });
});
