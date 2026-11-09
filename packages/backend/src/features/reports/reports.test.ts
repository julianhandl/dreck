import { afterEach, beforeEach, describe, expect, setSystemTime, test } from 'bun:test';
import { createTestApp, type Project } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
let web: Project;
beforeEach(async () => {
  setSystemTime(new Date('2026-03-10T12:00:00Z'));
  api = await createTestApp();
  web = await api.seedProject({ rate: 9000, customer: 'beta', name: 'Web' });
});
afterEach(() => {
  setSystemTime();
});

type Sums = {
  seconds: number;
  roundedSeconds: number;
  amountMinor: number;
  billableExpensesMinor: number;
  ownExpensesMinor: number;
};
type Report = {
  totals: Sums;
  customers: (Sums & { name: string; archived: boolean; projects: (Sums & { name: string })[] })[];
};

const entry = (projectId: number, date: string, durationSeconds: number): Promise<unknown> =>
  api.call('POST', '/time-entries', { projectId, date, durationSeconds });

const expense = (projectId: number, amountMinor: number, billable: boolean): Promise<unknown> =>
  api.call('POST', '/expenses', {
    projectId,
    date: '2026-03-05',
    amountMinor,
    description: 'Hotel; "Zentrum"',
    billable,
  });

const report = async (query = ''): Promise<Report> =>
  (await api.call<Report>('GET', `/reports?from=2026-03-01&to=2026-03-31${query}`)).body;

describe('reports', () => {
  test('Rounding applies to each Time Entry on its own (3 × 7 min at 15 = 45 min)', async () => {
    await api.call('PATCH', '/settings', { roundingMinutes: 15 });
    for (let i = 0; i < 3; i++) await entry(web.id, '2026-03-02', 7 * 60);
    const { totals } = await report();
    expect(totals.seconds).toBe(21 * 60);
    expect(totals.roundedSeconds).toBe(45 * 60);
    // 3 × round(9000 × 900 / 3600) = 3 × 2250
    expect(totals.amountMinor).toBe(6750);
  });

  test('sums add the rounded amounts per entry', async () => {
    // 1 s at 100 per hour = 0.028 → 0 each; the exact sum would round to 0 too, but 18 s = 0.5 → 1
    await api.call('PATCH', `/projects/${web.id}`, { hourlyRateMinor: 100 });
    await entry(web.id, '2026-03-02', 18);
    await entry(web.id, '2026-03-02', 18);
    expect((await report()).totals.amountMinor).toBe(2);
  });

  test('a running timer counts until now', async () => {
    setSystemTime(new Date('2026-03-10T10:00:00Z'));
    await api.call('POST', '/timer/start', { projectId: web.id });
    setSystemTime(new Date('2026-03-10T11:30:00Z'));
    expect((await report()).totals.seconds).toBe(5400);
  });

  test('grouped by customer and project, sorted by name, Archived included', async () => {
    const alpha = await api.seedProject({ customer: 'Alpha', name: 'App' });
    await entry(web.id, '2026-03-02', 3600);
    await entry(alpha.id, '2026-03-02', 1800);
    await api.call('PATCH', `/customers/${alpha.customerId}`, { archived: true });

    const { customers } = await report();
    expect(customers.map((c) => [c.name, c.archived, c.seconds])).toEqual([
      ['Alpha', true, 1800],
      ['beta', false, 3600],
    ]);
    expect(customers[1]?.projects.map((p) => p.name)).toEqual(['Web']);
  });

  test('billable expenses and own costs are separate', async () => {
    await expense(web.id, 1000, true);
    await expense(web.id, 250, false);
    expect((await report()).totals).toMatchObject({
      billableExpensesMinor: 1000,
      ownExpensesMinor: 250,
    });
  });

  test('period is inclusive and filters by customer', async () => {
    const other = await api.seedProject({ customer: 'Other' });
    await entry(web.id, '2026-03-01', 60);
    await entry(web.id, '2026-03-31', 60);
    await entry(web.id, '2026-04-01', 60);
    await entry(other.id, '2026-03-15', 60);
    expect((await report()).totals.seconds).toBe(180);
    expect((await report(`&customerId=${web.customerId}`)).totals.seconds).toBe(120);
  });

  test('from and to are required', async () => {
    expect((await api.call('GET', '/reports?from=2026-03-01')).status).toBe(400);
  });

  describe('CSV', () => {
    beforeEach(async () => {
      await api.call('PATCH', '/settings', { roundingMinutes: 15 });
      await entry(web.id, '2026-03-02', 7 * 60);
      await expense(web.id, 123456, true);
    });

    test('de: semicolon, decimal comma, BOM, file name', async () => {
      const res = await api.app.request(
        '/api/v1/reports?from=2026-03-01&to=2026-03-31&format=csv',
        {
          headers: { Authorization: 'Bearer test-secret-with-at-least-32-characters' },
        },
      );
      expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
      expect(res.headers.get('content-disposition')).toBe(
        'attachment; filename="dreck-report_2026-03-01_2026-03-31.csv"',
      );
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      const lines = new TextDecoder().decode(bytes.slice(3)).trimEnd().split('\r\n');
      expect(lines).toEqual([
        'Typ;Customer;Project;Datum;Dauer gerundet (Minuten);Beschreibung;Hourly Rate;Betrag;Billable',
        'Zeit;beta;Web;2026-03-02;15;;"90,00";"22,50";',
        'Expense;beta;Web;2026-03-05;;"Hotel; ""Zentrum""";;"1234,56";ja',
      ]);
    });

    test('en: comma and decimal point, also via Accept: text/csv', async () => {
      await api.call('PATCH', '/settings', { language: 'en' });
      const res = await api.app.request('/api/v1/reports?from=2026-03-01&to=2026-03-31', {
        headers: {
          Authorization: 'Bearer test-secret-with-at-least-32-characters',
          Accept: 'text/csv',
        },
      });
      const lines = (await res.text()).replace('﻿', '').trimEnd().split('\r\n');
      expect(lines[0]).toBe(
        'Type,Customer,Project,Date,Rounded duration (minutes),Description,Hourly rate,Amount,Billable',
      );
      expect(lines[1]).toBe('Time,beta,Web,2026-03-02,15,,90.00,22.50,');
      expect(lines[2]).toBe('Expense,beta,Web,2026-03-05,,"Hotel; ""Zentrum""",,1234.56,yes');
    });
  });
});
