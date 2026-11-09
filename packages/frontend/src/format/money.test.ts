import { describe, expect, test } from 'bun:test';
import { formatMoney, parseAmount } from './money';

// Intl separates amount and symbol with a no-break space
const normalize = (text: string): string => text.replace(/\s/g, ' ');

describe('formatMoney', () => {
  test('uses the language and the currency digits', () => {
    expect(normalize(formatMoney(123450, 'EUR', 'de'))).toBe('1.234,50 €');
    expect(normalize(formatMoney(123450, 'EUR', 'en'))).toBe('€1,234.50');
    expect(normalize(formatMoney(1234, 'JPY', 'de'))).toBe('1.234 ¥');
  });
});

describe('parseAmount', () => {
  test.each([
    ['12,50', 1250],
    ['12.5', 1250],
    ['12', 1200],
    ['0,05', 5],
    ['1.234,50', 123450],
    ['1,234.50', 123450],
    ['1.234', 123400],
    ['1,234', 123400],
    ['12,505', 1250500],
    ['1.234.567', 123456700],
    ['1234,5', 123450],
    [' 1 234,50 ', 123450],
    ['0', 0],
  ])('EUR %p → %p', (input, expected) => {
    expect(parseAmount(input, 'EUR')).toBe(expected);
  });

  test.each([
    '',
    ',50',
    '12,',
    '12,5055',
    '-5',
    '1.234.56',
    '1,23,456',
    '12a',
    '€12',
    '89,901.234,5',
    '1,234.567',
  ])('EUR %p is invalid', (input) => {
    expect(parseAmount(input, 'EUR')).toBeNull();
  });

  test('currency without minor units', () => {
    expect(parseAmount('1.234', 'JPY')).toBe(1234);
    expect(parseAmount('12,5', 'JPY')).toBeNull();
  });
});
