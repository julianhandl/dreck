import { describe, expect, test } from 'bun:test';
import { currencyFractionDigits, minorToMajor } from './money';

describe('money', () => {
  test('fraction digits follow ISO 4217', () => {
    expect(currencyFractionDigits('EUR')).toBe(2);
    expect(currencyFractionDigits('JPY')).toBe(0);
  });

  test('minor to major', () => {
    expect(minorToMajor(1250, 'EUR')).toBe(12.5);
    expect(minorToMajor(1250, 'JPY')).toBe(1250);
  });
});
