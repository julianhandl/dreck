import { describe, expect, test } from 'bun:test';
import {
  changeTaskRow,
  followsProjectRate,
  newEntryRate,
  newTaskRow,
  taskInputs,
  taskRowErrors,
  taskRows,
} from './task-rows';

const rateText = (minor: number): string => (minor / 100).toFixed(2);
const parseRate = (text: string): number | null => {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
};
const MESSAGES = { nameRequired: 'required', nameTaken: 'taken', rate: 'rate' };

describe('taskRows', () => {
  test('rows of Tasks and of Default Tasks', () => {
    expect(
      taskRows(
        [
          { id: 3, name: 'Design', billable: true, hourlyRateMinor: 12000, archived: false },
          { name: 'Akquise', billable: false },
        ],
        rateText,
      ),
    ).toEqual([
      { key: 'task-3', id: 3, name: 'Design', billable: true, rate: '120.00', archived: false },
      {
        key: 'default-1',
        id: undefined,
        name: 'Akquise',
        billable: false,
        rate: '',
        archived: false,
      },
    ]);
  });

  test('a non-billable row loses its rate', () => {
    const rows = [{ ...newTaskRow('a'), rate: '100' }];
    expect(changeTaskRow(rows, 'a', { billable: false })[0]).toMatchObject({
      billable: false,
      rate: '',
    });
  });
});

describe('taskRowErrors', () => {
  test('missing and repeated names, unreadable rates; empty new rows are ignored', () => {
    const rows = [
      { ...newTaskRow('a'), name: 'Design' },
      { ...newTaskRow('b'), name: ' design ' },
      { ...newTaskRow('c'), id: 5 },
      { ...newTaskRow('d'), name: 'Code', rate: 'abc' },
      newTaskRow('e'),
    ];
    expect(taskRowErrors(rows, parseRate, MESSAGES)).toEqual({
      'tasks.b.name': 'taken',
      'tasks.c.name': 'required',
      'tasks.d.rate': 'rate',
    });
  });
});

describe('taskInputs', () => {
  test('trims names, empty rate = Project rate, drops empty new rows', () => {
    const rows = [
      { ...newTaskRow('a'), id: 1, name: ' Design ', rate: '120' },
      { ...newTaskRow('b'), name: 'Akquise', billable: false },
      newTaskRow('c'),
    ];
    expect(taskInputs(rows, parseRate)).toEqual([
      { id: 1, name: 'Design', billable: true, hourlyRateMinor: 12000, archived: false },
      { name: 'Akquise', billable: false, hourlyRateMinor: null, archived: false },
    ]);
  });
});

describe('newEntryRate', () => {
  const before = {
    hourlyRateMinor: 9000,
    tasks: [
      { id: 1, hourlyRateMinor: 12000 },
      { id: 2, hourlyRateMinor: null },
    ],
  };

  test('a new Project rate reaches entries without own Task rate', () => {
    const after = { ...before, hourlyRateMinor: 10000 };
    expect(newEntryRate({ taskId: null }, before, after)).toBe(10000);
    expect(newEntryRate({ taskId: 2 }, before, after)).toBe(10000);
    expect(newEntryRate({ taskId: 1 }, before, after)).toBeNull();
  });

  test('a new Task rate reaches only its entries; a removed Task keeps its rate', () => {
    const after = { hourlyRateMinor: 9000, tasks: [{ id: 2, hourlyRateMinor: 15000 }] };
    expect(newEntryRate({ taskId: 2 }, before, after)).toBe(15000);
    expect(newEntryRate({ taskId: null }, before, after)).toBeNull();
    expect(newEntryRate({ taskId: 1 }, before, after)).toBeNull();
  });

  test('clearing the own rate falls back to the Project rate', () => {
    const after = { hourlyRateMinor: 9000, tasks: [{ id: 1, hourlyRateMinor: null }] };
    expect(newEntryRate({ taskId: 1 }, before, after)).toBe(9000);
  });
});

describe('followsProjectRate', () => {
  test('only entries without a Task of their own rate', () => {
    const tasks = [
      { id: 1, hourlyRateMinor: 12000 },
      { id: 2, hourlyRateMinor: null },
    ];
    expect(followsProjectRate({ taskId: null }, tasks)).toBe(true);
    expect(followsProjectRate({ taskId: 2 }, tasks)).toBe(true);
    expect(followsProjectRate({ taskId: 1 }, tasks)).toBe(false);
  });
});
