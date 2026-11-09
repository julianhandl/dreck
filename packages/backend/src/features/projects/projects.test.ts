import { beforeEach, describe, expect, test } from 'bun:test';
import { createTestApp } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  api = await createTestApp();
});

type TimeEntry = { id: number; hourlyRateMinor: number; hourlyRateOverridden: boolean };
type EntryName = 'before' | 'first' | 'last' | 'after' | 'corrected';

describe('projects', () => {
  test('POST without rate copies the rate of the customer', async () => {
    const project = await api.seedProject({ rate: 7500 });
    expect(project.hourlyRateMinor).toBe(7500);
  });

  test('POST with rate keeps it', async () => {
    const customer = await api.call<{ id: number }>('POST', '/customers', { name: 'Acme' });
    const res = await api.call('POST', '/projects', {
      customerId: customer.body.id,
      name: 'Web',
      hourlyRateMinor: 12000,
    });
    expect(res.body.hourlyRateMinor).toBe(12000);
  });

  test('unknown customer fails validation at customerId', async () => {
    const res = await api.call<{ code: string; details: { issues: { path: string[] }[] } }>(
      'POST',
      '/projects',
      { customerId: 42, name: 'Web' },
    );
    expect(res.status).toBe(400);
    expect(res.body.details.issues[0]?.path).toEqual(['customerId']);
  });

  test('names are unique per customer ignoring case', async () => {
    const a = await api.seedProject({ customer: 'A', name: 'Web' });
    const b = await api.seedProject({ customer: 'B', name: 'Web' });
    expect(b.id).toBeGreaterThan(a.id);
    const res = await api.call('POST', '/projects', { customerId: a.customerId, name: 'WEB' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('name_taken');
  });

  test('archive and restore', async () => {
    const project = await api.seedProject();
    expect(
      (await api.call('PATCH', `/projects/${project.id}`, { archived: true })).body.archived,
    ).toBe(true);
    expect(
      (await api.call('PATCH', `/projects/${project.id}`, { archived: false })).body.archived,
    ).toBe(false);
  });

  test('delete only without time entries or expenses', async () => {
    const project = await api.seedProject();
    await api.call('POST', '/expenses', {
      projectId: project.id,
      date: '2026-01-01',
      amountMinor: 100,
      description: 'Train',
      billable: true,
    });
    const res = await api.call('DELETE', `/projects/${project.id}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('has_dependencies');
  });

  describe('Hourly Rate change', () => {
    async function setup(): Promise<{ projectId: number; ids: Record<EntryName, number> }> {
      const project = await api.seedProject({ rate: 9000 });
      const create = async (date: string): Promise<number> =>
        (
          await api.call<TimeEntry>('POST', '/time-entries', {
            projectId: project.id,
            date,
            durationSeconds: 3600,
          })
        ).body.id;
      const ids = {
        before: await create('2026-01-31'),
        first: await create('2026-02-01'),
        last: await create('2026-02-28'),
        after: await create('2026-03-01'),
        corrected: await create('2026-02-15'),
      };
      await api.call('PATCH', `/time-entries/${ids.corrected}`, { hourlyRateMinor: 5000 });
      return { projectId: project.id, ids };
    }

    async function entries(): Promise<Map<number, TimeEntry>> {
      const res = await api.call<TimeEntry[]>('GET', '/time-entries');
      return new Map(res.body.map((e) => [e.id, e]));
    }

    test('without applyToTimeEntries existing entries keep their rate', async () => {
      const { projectId, ids } = await setup();
      await api.call('PATCH', `/projects/${projectId}`, { hourlyRateMinor: 10000 });
      expect((await entries()).get(ids.first)?.hourlyRateMinor).toBe(9000);
    });

    test('applies to the range, both ends inclusive, and skips corrected entries', async () => {
      const { projectId, ids } = await setup();
      const res = await api.call('PATCH', `/projects/${projectId}`, {
        hourlyRateMinor: 10000,
        applyToTimeEntries: { from: '2026-02-01', to: '2026-02-28' },
      });
      expect(res.body.hourlyRateMinor).toBe(10000);
      const all = await entries();
      expect(all.get(ids.before)?.hourlyRateMinor).toBe(9000);
      expect(all.get(ids.first)?.hourlyRateMinor).toBe(10000);
      expect(all.get(ids.last)?.hourlyRateMinor).toBe(10000);
      expect(all.get(ids.after)?.hourlyRateMinor).toBe(9000);
      expect(all.get(ids.corrected)).toMatchObject({
        hourlyRateMinor: 5000,
        hourlyRateOverridden: true,
      });
    });

    test('empty range means all; includeOverridden overwrites and clears the mark', async () => {
      const { projectId, ids } = await setup();
      await api.call('PATCH', `/projects/${projectId}`, {
        hourlyRateMinor: 10000,
        applyToTimeEntries: { includeOverridden: true },
      });
      const all = await entries();
      expect([...all.values()].every((e) => e.hourlyRateMinor === 10000)).toBe(true);
      expect(all.get(ids.corrected)?.hourlyRateOverridden).toBe(false);
    });

    test('applyToTimeEntries requires hourlyRateMinor', async () => {
      const { projectId } = await setup();
      const res = await api.call('PATCH', `/projects/${projectId}`, { applyToTimeEntries: {} });
      expect(res.status).toBe(400);
    });
  });
});
