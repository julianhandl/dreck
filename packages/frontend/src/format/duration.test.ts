import { describe, expect, test } from 'bun:test';
import { formatDuration, parseDuration } from './duration';

describe('formatDuration', () => {
  test.each([
    [0, '0:00'],
    [59, '0:00'],
    [2820, '0:47'],
    [3599, '0:59'],
    [9000, '2:30'],
    [86400, '24:00'],
    [360000, '100:00'],
  ])('%p s → %p', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('parseDuration', () => {
  test.each([
    ['2:30', 9000],
    ['0:45', 2700],
    ['2', 7200],
    [':45', 2700],
    ['02:05', 7500],
    [' 1:15 ', 4500],
    ['0:00', 0],
    ['24:00', 86400],
    ['2,5', 9000],
    ['2.5', 9000],
    [',5', 1800],
    ['0,75', 2700],
    ['1,33', 4800],
    ['24,0', 86400],
  ])('%p → %p s', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  test.each([
    '',
    ' ',
    ':',
    '2:',
    '2:5',
    '2:60',
    '2,',
    '2.',
    ',',
    '1,5:00',
    '1,2,5',
    '-1,5',
    '-1:00',
    '2:30:00',
    'abc',
    '1 h',
  ])('%p is invalid', (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});
