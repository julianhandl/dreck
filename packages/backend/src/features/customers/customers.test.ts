import { beforeEach, describe, expect, test } from 'bun:test';
import { createTestApp } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  api = await createTestApp();
});

type Customer = {
  id: number;
  name: string;
  hourlyRateMinor: number;
  address: string | null;
  archived: boolean;
};
type TimeEntry = { id: number; hourlyRateMinor: number; hourlyRateOverridden: boolean };

describe('customers', () => {
  test('POST without rate copies the Default Hourly Rate, later changes only affect new ones', async () => {
    await api.call('PATCH', '/settings', { defaultHourlyRateMinor: 8000 });
    const first = await api.call<Customer>('POST', '/customers', { name: 'Acme' });
    expect(first.status).toBe(201);
    expect(first.body).toEqual({
      id: 1,
      name: 'Acme',
      hourlyRateMinor: 8000,
      address: null,
      archived: false,
    });

    await api.call('PATCH', '/settings', { defaultHourlyRateMinor: 9500 });
    const second = await api.call<Customer>('POST', '/customers', { name: 'Beta' });
    expect(second.body.hourlyRateMinor).toBe(9500);
    const list = await api.call<Customer[]>('GET', '/customers');
    expect(list.body[0]?.hourlyRateMinor).toBe(8000);
  });

  test('names are unique ignoring case', async () => {
    await api.call('POST', '/customers', { name: 'Acme' });
    const res = await api.call('POST', '/customers', { name: 'ACME' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('name_taken');
  });

  test('blank names fail validation', async () => {
    const res = await api.call('POST', '/customers', { name: '   ' });
    expect(res.status).toBe(400);
  });

  test('list is sorted by name ignoring case and includes Archived', async () => {
    await api.call('POST', '/customers', { name: 'beta' });
    await api.call('POST', '/customers', { name: 'Alpha' });
    await api.call('PATCH', '/customers/1', { archived: true });
    const res = await api.call<Customer[]>('GET', '/customers');
    expect(res.body.map((c) => [c.name, c.archived])).toEqual([
      ['Alpha', false],
      ['beta', true],
    ]);
  });

  test('delete only without projects', async () => {
    const project = await api.seedProject();
    const blocked = await api.call('DELETE', `/customers/${project.customerId}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('has_dependencies');

    await api.call('DELETE', `/projects/${project.id}`);
    expect((await api.call('DELETE', `/customers/${project.customerId}`)).status).toBe(204);
    expect((await api.call('DELETE', `/customers/${project.customerId}`)).status).toBe(404);
  });

  test('PATCH of an unknown customer is 404', async () => {
    const res = await api.call('PATCH', '/customers/99', { name: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
  });

  describe('Hourly Rate change', () => {
    test('without applyToProjects only the customer changes', async () => {
      const project = await api.seedProject({ rate: 9000 });
      await api.call('PATCH', `/customers/${project.customerId}`, { hourlyRateMinor: 10000 });
      const projects = await api.call<{ hourlyRateMinor: number }[]>('GET', '/projects');
      expect(projects.body[0]?.hourlyRateMinor).toBe(9000);
    });

    test('chosen projects and their time entries in the range take over the rate', async () => {
      const web = await api.seedProject({ rate: 9000, customer: 'Acme', name: 'Web' });
      const app = (
        await api.call<{ id: number }>('POST', '/projects', {
          customerId: web.customerId,
          name: 'App',
        })
      ).body;
      const entry = (date: string, projectId: number): Promise<{ body: TimeEntry }> =>
        api.call<TimeEntry>('POST', '/time-entries', { projectId, date, durationSeconds: 3600 });
      const old = await entry('2026-01-10', web.id);
      const inRange = await entry('2026-02-10', web.id);
      const corrected = await entry('2026-02-11', web.id);
      await api.call('PATCH', `/time-entries/${corrected.body.id}`, { hourlyRateMinor: 5000 });
      const otherProject = await entry('2026-02-10', app.id);

      const res = await api.call('PATCH', `/customers/${web.customerId}`, {
        hourlyRateMinor: 10000,
        applyToProjects: { projectIds: [web.id], applyToTimeEntries: { from: '2026-02-01' } },
      });
      expect(res.body.hourlyRateMinor).toBe(10000);

      const entries = await api.call<TimeEntry[]>('GET', '/time-entries');
      const rateOf = (id: number): number | undefined =>
        entries.body.find((e) => e.id === id)?.hourlyRateMinor;
      expect(rateOf(old.body.id)).toBe(9000);
      expect(rateOf(inRange.body.id)).toBe(10000);
      expect(rateOf(corrected.body.id)).toBe(5000);
      expect(rateOf(otherProject.body.id)).toBe(9000);

      const projects = await api.call<{ id: number; hourlyRateMinor: number }[]>(
        'GET',
        '/projects',
      );
      expect(projects.body.find((p) => p.id === web.id)?.hourlyRateMinor).toBe(10000);
      expect(projects.body.find((p) => p.id === app.id)?.hourlyRateMinor).toBe(9000);
    });

    test('without applyToTimeEntries chosen projects change but no time entry', async () => {
      const project = await api.seedProject({ rate: 9000 });
      const entry = await api.call<TimeEntry>('POST', '/time-entries', {
        projectId: project.id,
        date: '2026-02-10',
        durationSeconds: 3600,
      });
      await api.call('PATCH', `/customers/${project.customerId}`, {
        hourlyRateMinor: 10000,
        applyToProjects: { projectIds: [project.id] },
      });
      const projects = await api.call<{ id: number; hourlyRateMinor: number }[]>(
        'GET',
        '/projects',
      );
      expect(projects.body.find((p) => p.id === project.id)?.hourlyRateMinor).toBe(10000);
      const entries = await api.call<TimeEntry[]>('GET', '/time-entries');
      expect(entries.body.find((e) => e.id === entry.body.id)?.hourlyRateMinor).toBe(9000);
    });

    test('a project of another customer fails and changes nothing', async () => {
      const own = await api.seedProject({ rate: 9000 });
      const foreign = await api.seedProject({ rate: 7000 });
      const res = await api.call('PATCH', `/customers/${own.customerId}`, {
        hourlyRateMinor: 10000,
        applyToProjects: { projectIds: [own.id, foreign.id] },
      });
      expect(res.status).toBe(400);
      const customers = await api.call<Customer[]>('GET', '/customers');
      expect(customers.body.find((c) => c.id === own.customerId)?.hourlyRateMinor).toBe(9000);
      const projects = await api.call<{ id: number; hourlyRateMinor: number }[]>(
        'GET',
        '/projects',
      );
      expect(projects.body.find((p) => p.id === own.id)?.hourlyRateMinor).toBe(9000);
    });

    test('applyToProjects requires hourlyRateMinor', async () => {
      const project = await api.seedProject();
      const res = await api.call('PATCH', `/customers/${project.customerId}`, {
        applyToProjects: { projectIds: [project.id] },
      });
      expect(res.status).toBe(400);
    });
  });
});
