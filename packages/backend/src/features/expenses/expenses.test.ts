import { beforeEach, describe, expect, test } from 'bun:test';
import { createTestApp, type Project } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
let project: Project;
beforeEach(async () => {
  api = await createTestApp();
  project = await api.seedProject();
});

type Expense = { id: number; projectId: number; date: string; amountMinor: number };

const expense = (body: Record<string, unknown> = {}): Record<string, unknown> => ({
  projectId: project.id,
  date: '2026-03-02',
  amountMinor: 1250,
  description: 'Train ticket',
  billable: true,
  ...body,
});

describe('expenses', () => {
  test('POST, PATCH, DELETE', async () => {
    const created = await api.call<Expense>('POST', '/expenses', expense());
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: 1, amountMinor: 1250, billable: true });

    const patched = await api.call('PATCH', `/expenses/${created.body.id}`, { billable: false });
    expect(patched.body.billable).toBe(false);

    expect((await api.call('DELETE', `/expenses/${created.body.id}`)).status).toBe(204);
    expect((await api.call('DELETE', `/expenses/${created.body.id}`)).status).toBe(404);
  });

  test.each([
    { amountMinor: 0 },
    { amountMinor: -100 },
    { description: '   ' },
    { description: undefined },
    { billable: undefined },
    { projectId: 999 },
  ])('rejects %j', async (body) => {
    const res = await api.call('POST', '/expenses', expense(body));
    expect(res.status).toBe(400);
  });

  test('list: date descending, filtered by customer and range', async () => {
    const other = await api.seedProject({ customer: 'Other' });
    await api.call('POST', '/expenses', expense({ date: '2026-03-01' }));
    await api.call('POST', '/expenses', expense({ date: '2026-03-03' }));
    await api.call('POST', '/expenses', expense({ date: '2026-03-02', projectId: other.id }));

    const all = await api.call<Expense[]>('GET', '/expenses');
    expect(all.body.map((e) => e.date)).toEqual(['2026-03-03', '2026-03-02', '2026-03-01']);

    const filtered = await api.call<Expense[]>(
      'GET',
      `/expenses?customerId=${project.customerId}&from=2026-03-02`,
    );
    expect(filtered.body.map((e) => e.date)).toEqual(['2026-03-03']);
  });

  test('an expense locks the currency', async () => {
    await api.call('POST', '/expenses', expense());
    await api.call('DELETE', `/projects/${project.id}`);
    const res = await api.call('PATCH', '/settings', { currency: 'USD' });
    expect(res.status).toBe(409);
  });
});
