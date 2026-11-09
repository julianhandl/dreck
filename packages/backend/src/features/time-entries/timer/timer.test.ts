import { afterEach, beforeEach, describe, expect, setSystemTime, test } from 'bun:test';
import { createTestApp, type Project } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
let project: Project;
beforeEach(async () => {
  setSystemTime(new Date('2026-03-02T09:00:00Z'));
  api = await createTestApp();
  project = await api.seedProject({ rate: 9000 });
});
afterEach(() => {
  setSystemTime();
});

type TimeEntry = {
  id: number;
  date: string;
  durationSeconds: number;
  runningSince: string | null;
  hourlyRateMinor: number;
};
type StartResult = { started: TimeEntry; stopped: TimeEntry | null };

const at = (iso: string): void => {
  setSystemTime(new Date(iso));
};

describe('timer', () => {
  test('GET /timer is null without a running timer', async () => {
    expect((await api.call('GET', '/timer')).body).toBeNull();
  });

  test('a new timer creates a running entry of today with the project rate', async () => {
    const res = await api.call<StartResult>('POST', '/timer/start', {
      projectId: project.id,
      description: 'Review',
    });
    expect(res.status).toBe(200);
    expect(res.body.stopped).toBeNull();
    expect(res.body.started).toMatchObject({
      date: '2026-03-02',
      durationSeconds: 0,
      runningSince: '2026-03-02T09:00:00.000Z',
      hourlyRateMinor: 9000,
    });
    expect((await api.call<TimeEntry>('GET', '/timer')).body.id).toBe(res.body.started.id);
  });

  test('"today" is the day in the time zone of the instance', async () => {
    await api.call('PATCH', '/settings', { timezone: 'Europe/Vienna' });
    at('2026-03-02T23:30:00Z');
    const res = await api.call<StartResult>('POST', '/timer/start', { projectId: project.id });
    expect(res.body.started.date).toBe('2026-03-03');
  });

  test('a new timer stops the running one in the same call', async () => {
    const first = await api.call<StartResult>('POST', '/timer/start', { projectId: project.id });
    at('2026-03-02T09:47:00Z');
    const second = await api.call<StartResult>('POST', '/timer/start', { projectId: project.id });
    expect(second.body.stopped).toMatchObject({
      id: first.body.started.id,
      durationSeconds: 47 * 60,
      runningSince: null,
    });
    expect(second.body.started.id).not.toBe(first.body.started.id);
  });

  test('continuing an entry of today keeps its rate and adds up', async () => {
    const first = await api.call<StartResult>('POST', '/timer/start', { projectId: project.id });
    at('2026-03-02T10:00:00Z');
    await api.call('POST', '/timer/stop');
    await api.call('PATCH', `/projects/${project.id}`, { hourlyRateMinor: 12000 });
    at('2026-03-02T11:00:00Z');
    const resumed = await api.call<StartResult>('POST', '/timer/start', {
      timeEntryId: first.body.started.id,
    });
    expect(resumed.body.started).toMatchObject({ durationSeconds: 3600, hourlyRateMinor: 9000 });
    at('2026-03-02T11:30:00Z');
    const stopped = await api.call<TimeEntry>('POST', '/timer/stop', {});
    expect(stopped.body.durationSeconds).toBe(5400);
  });

  test('entries of earlier days cannot be continued', async () => {
    const old = await api.call<TimeEntry>('POST', '/time-entries', {
      projectId: project.id,
      date: '2026-03-01',
      durationSeconds: 60,
    });
    const res = await api.call('POST', '/timer/start', { timeEntryId: old.body.id });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_failed');
  });

  test('a timer over midnight keeps the whole duration on the start day', async () => {
    at('2026-03-02T23:00:00Z');
    await api.call('POST', '/timer/start', { projectId: project.id });
    at('2026-03-03T01:00:00Z');
    const res = await api.call<TimeEntry>('POST', '/timer/stop');
    expect(res.body).toMatchObject({ date: '2026-03-02', durationSeconds: 7200 });
  });

  test('stop without a running timer is 409 no_running_timer', async () => {
    const res = await api.call('POST', '/timer/stop');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('no_running_timer');
  });

  describe('at', () => {
    test('the server takes min(at, now)', async () => {
      const res = await api.call<StartResult>('POST', '/timer/start', {
        projectId: project.id,
        at: '2026-03-02T12:00:00+01:00',
      });
      expect(res.body.started.runningSince).toBe('2026-03-02T09:00:00.000Z');
    });

    test('stop at the moment of the click', async () => {
      await api.call('POST', '/timer/start', { projectId: project.id });
      at('2026-03-02T12:00:00Z');
      const res = await api.call<TimeEntry>('POST', '/timer/stop', {
        at: '2026-03-02T10:00:00Z',
      });
      expect(res.body.durationSeconds).toBe(3600);
    });

    test('at before the start of the running timer is 400', async () => {
      await api.call('POST', '/timer/start', { projectId: project.id });
      const stop = await api.call('POST', '/timer/stop', { at: '2026-03-02T08:00:00Z' });
      expect(stop.status).toBe(400);
      const start = await api.call('POST', '/timer/start', {
        projectId: project.id,
        at: '2026-03-02T08:00:00Z',
      });
      expect(start.status).toBe(400);
      // The running timer is untouched
      expect((await api.call<TimeEntry>('GET', '/timer')).body.durationSeconds).toBe(0);
    });

    test('at without offset is 400', async () => {
      const res = await api.call('POST', '/timer/start', {
        projectId: project.id,
        at: '2026-03-02T09:00:00',
      });
      expect(res.status).toBe(400);
    });

    test('at has no lower bound (forgotten timer)', async () => {
      const res = await api.call<StartResult>('POST', '/timer/start', {
        projectId: project.id,
        at: '2026-03-01T20:00:00Z',
      });
      expect(res.body.started).toMatchObject({
        date: '2026-03-01',
        runningSince: '2026-03-01T20:00:00.000Z',
      });
    });
  });

  test('exactly one of projectId or timeEntryId', async () => {
    const both = await api.call('POST', '/timer/start', { projectId: project.id, timeEntryId: 1 });
    expect(both.status).toBe(400);
    const none = await api.call('POST', '/timer/start', {});
    expect(none.status).toBe(400);
  });
});
