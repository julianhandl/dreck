import { afterEach, beforeEach, describe, expect, setSystemTime, test } from 'bun:test';
import { createTestApp, type Project } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
let project: Project;
beforeEach(async () => {
  api = await createTestApp();
  project = await api.seedProject({ rate: 9000 });
});
afterEach(() => {
  setSystemTime();
});

type TimeEntry = {
  id: number;
  projectId: number;
  taskId: number | null;
  date: string;
  durationSeconds: number;
  runningSince: string | null;
  description: string | null;
  hourlyRateMinor: number;
  hourlyRateOverridden: boolean;
  invoiceItemId: number | null;
};

async function create(body: Record<string, unknown>): Promise<TimeEntry> {
  const res = await api.call<TimeEntry>('POST', '/time-entries', {
    projectId: project.id,
    date: '2026-03-02',
    durationSeconds: 1800,
    ...body,
  });
  expect(res.status).toBe(201);
  return res.body;
}

describe('time entries', () => {
  test('POST copies the rate of the project, blank description becomes null', async () => {
    const entry = await create({ description: '  ' });
    expect(entry).toEqual({
      id: 1,
      projectId: project.id,
      taskId: null,
      date: '2026-03-02',
      durationSeconds: 1800,
      runningSince: null,
      description: null,
      hourlyRateMinor: 9000,
      hourlyRateOverridden: false,
      invoiceItemId: null,
    });
  });

  test.each([
    { date: '2026-02-30' },
    { date: '02.03.2026' },
    { durationSeconds: -1 },
    { durationSeconds: 1.5 },
    { projectId: 999 },
  ])('rejects %j', async (body) => {
    const res = await api.call('POST', '/time-entries', {
      projectId: project.id,
      date: '2026-03-02',
      durationSeconds: 60,
      ...body,
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_failed');
  });

  test('list: date descending, within a day by creation', async () => {
    const a = await create({ date: '2026-03-01' });
    const b = await create({ date: '2026-03-02' });
    const c = await create({ date: '2026-03-02' });
    const res = await api.call<TimeEntry[]>('GET', '/time-entries');
    expect(res.body.map((e) => e.id)).toEqual([b.id, c.id, a.id]);
  });

  test('filters combine with AND, from/to inclusive', async () => {
    const other = await api.seedProject({ customer: 'Other' });
    await create({ date: '2026-02-28' });
    const inRange = await create({ date: '2026-03-01' });
    await create({ date: '2026-03-01', projectId: other.id });
    await create({ date: '2026-03-02' });

    const ids = async (query: string): Promise<number[]> =>
      (await api.call<TimeEntry[]>('GET', `/time-entries?${query}`)).body.map((e) => e.id);
    expect(await ids(`from=2026-03-01&to=2026-03-01&projectId=${project.id}`)).toEqual([
      inRange.id,
    ]);
    expect(await ids(`from=2026-03-01&to=2026-03-01&customerId=${project.customerId}`)).toEqual([
      inRange.id,
    ]);
    expect((await ids('')).length).toBe(4);
  });

  describe('PATCH and the Hourly Rate', () => {
    test('a rate alone marks the entry as corrected by hand', async () => {
      const entry = await create({});
      const res = await api.call<TimeEntry>('PATCH', `/time-entries/${entry.id}`, {
        hourlyRateMinor: 5000,
      });
      expect(res.body).toMatchObject({ hourlyRateMinor: 5000, hourlyRateOverridden: true });
    });

    test('moving to another project takes its rate and clears the mark', async () => {
      const other = await api.seedProject({ rate: 12000, customer: 'Other' });
      const entry = await create({});
      await api.call('PATCH', `/time-entries/${entry.id}`, { hourlyRateMinor: 5000 });
      const res = await api.call<TimeEntry>('PATCH', `/time-entries/${entry.id}`, {
        projectId: other.id,
      });
      expect(res.body).toMatchObject({
        projectId: other.id,
        hourlyRateMinor: 12000,
        hourlyRateOverridden: false,
      });
    });

    test('moving with a rate: the sent rate wins and counts as corrected', async () => {
      const other = await api.seedProject({ rate: 12000, customer: 'Other' });
      const entry = await create({});
      const res = await api.call<TimeEntry>('PATCH', `/time-entries/${entry.id}`, {
        projectId: other.id,
        hourlyRateMinor: 3000,
      });
      expect(res.body).toMatchObject({ hourlyRateMinor: 3000, hourlyRateOverridden: true });
    });
  });

  test('PATCH duration on a running entry sets the displayed total and restarts now', async () => {
    setSystemTime(new Date('2026-03-02T10:00:00Z'));
    const started = await api.call<{ started: TimeEntry }>('POST', '/timer/start', {
      projectId: project.id,
    });
    setSystemTime(new Date('2026-03-02T11:00:00Z'));
    const res = await api.call<TimeEntry>('PATCH', `/time-entries/${started.body.started.id}`, {
      durationSeconds: 1800,
    });
    expect(res.body).toMatchObject({
      durationSeconds: 1800,
      runningSince: '2026-03-02T11:00:00.000Z',
    });
  });

  test('description can be cleared with null', async () => {
    const entry = await create({ description: 'Meeting' });
    const res = await api.call<TimeEntry>('PATCH', `/time-entries/${entry.id}`, {
      description: null,
    });
    expect(res.body.description).toBeNull();
  });

  test('DELETE', async () => {
    const entry = await create({});
    expect((await api.call('DELETE', `/time-entries/${entry.id}`)).status).toBe(204);
    expect((await api.call('DELETE', `/time-entries/${entry.id}`)).status).toBe(404);
    expect(
      (await api.call('PATCH', `/time-entries/${entry.id}`, { date: '2026-01-01' })).status,
    ).toBe(404);
  });
});
