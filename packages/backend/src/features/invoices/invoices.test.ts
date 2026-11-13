import { beforeEach, describe, expect, test } from 'bun:test';
import type { Invoice } from '@dreck/shared/api/invoices';
import { createTestApp, type Project } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
let project: Project;
beforeEach(async () => {
  api = await createTestApp();
  project = await api.seedProject({ rate: 10000, customer: 'Acme', name: 'Web' });
});

type Entry = { id: number; invoiceItemId: number | null };

const entry = (date: string, durationSeconds: number, projectId = project.id): Promise<Entry> =>
  api
    .call<Entry>('POST', '/time-entries', { projectId, date, durationSeconds })
    .then((r) => r.body);

const expense = (date: string, amountMinor: number, billable = true): Promise<Entry> =>
  api
    .call<Entry>('POST', '/expenses', {
      projectId: project.id,
      date,
      amountMinor,
      description: 'Train',
      billable,
    })
    .then((r) => r.body);

const invoice = (body: Record<string, unknown> = {}): ReturnType<typeof api.call<Invoice>> =>
  api.call<Invoice>('POST', '/invoices', {
    customerId: project.customerId,
    issueDate: '2026-04-01',
    dueDate: '2026-04-15',
    ...body,
  });

const IMPORT = { from: '2026-03-01', to: '2026-03-31', grouping: 'project', expenses: true };

describe('invoices', () => {
  test('a draft copies recipient, notes and tax and numbers itself', async () => {
    await api.call('PATCH', `/customers/${project.customerId}`, {
      address: 'Main St 1\n1010 Wien',
    });
    await api.call('PATCH', '/settings', {
      defaultTaxBasisPoints: 2000,
      defaultInvoiceNotes: 'IBAN AT00',
    });
    const first = await invoice();
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      number: '1',
      recipient: 'Acme\nMain St 1\n1010 Wien',
      notes: 'IBAN AT00',
      taxBasisPoints: 2000,
      discountBasisPoints: 0,
      status: 'draft',
      items: [],
      totalMinor: 0,
    });

    await invoice({ number: 'RE-2026-009' });
    expect((await invoice()).body.number).toBe('RE-2026-010');
    expect((await invoice({ number: 're-2026-010' })).status).toBe(409);
  });

  test('items and totals: discount, then tax', async () => {
    const res = await invoice({
      discountBasisPoints: 1000,
      taxBasisPoints: 2000,
      items: [
        { description: 'Design', quantityHundredths: 1917, unitPriceMinor: 10000 },
        { description: 'Marketing', quantityHundredths: 1075, unitPriceMinor: 10000 },
      ],
    });
    expect(res.body.items.map((i) => i.amountMinor)).toEqual([191700, 107500]);
    expect(res.body).toMatchObject({
      subtotalMinor: 299200,
      discountMinor: 29920,
      taxMinor: 53856,
      totalMinor: 323136,
    });
  });

  test('import per project: rounded hours, only uninvoiced entries of the customer in range', async () => {
    await api.call('PATCH', '/settings', { roundingMinutes: 15 });
    const a = await entry('2026-03-02', 3600 + 7 * 60); // 1:15 after rounding
    const b = await entry('2026-03-20', 1800);
    await entry('2026-04-01', 3600); // outside the range
    await entry('2026-03-03', 40); // rounds to 0, stays uninvoiced
    const other = await api.seedProject({ customer: 'Other' });
    await entry('2026-03-05', 3600, other.id);
    const travel = await expense('2026-03-10', 4500);
    await expense('2026-03-11', 999, false);

    const res = await invoice({ import: IMPORT });
    expect(res.body).toMatchObject({ periodFrom: '2026-03-01', periodTo: '2026-03-31' });
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toMatchObject({ quantityHundredths: 175, unitPriceMinor: 10000 });
    expect(res.body.items[0]?.description).toStartWith('Web (');
    expect(res.body.items[1]).toMatchObject({ quantityHundredths: 100, unitPriceMinor: 4500 });

    const entries = await api.call<Entry[]>('GET', '/time-entries');
    const invoiced = entries.body.filter((e) => e.invoiceItemId !== null).map((e) => e.id);
    expect(invoiced.sort()).toEqual([a.id, b.id].sort());
    const expenses = await api.call<Entry[]>('GET', '/expenses');
    expect(expenses.body.find((e) => e.id === travel.id)?.invoiceItemId).toBe(
      res.body.items[1]?.id ?? -1,
    );

    // A second import finds nothing left
    expect((await invoice({ import: IMPORT })).body.items).toEqual([]);
  });

  test('import per time entry, rates split items', async () => {
    await entry('2026-03-02', 3600);
    const corrected = await entry('2026-03-03', 1800);
    await api.call('PATCH', `/time-entries/${corrected.id}`, { hourlyRateMinor: 5000 });
    const perProject = await invoice({ import: { ...IMPORT, expenses: false } });
    expect(perProject.body.items.map((i) => i.unitPriceMinor)).toEqual([10000, 5000]);
    await api.call('DELETE', `/invoices/${perProject.body.id}`);

    const perEntry = await invoice({ import: { ...IMPORT, grouping: 'timeEntry' } });
    expect(perEntry.body.items.map((i) => i.quantityHundredths)).toEqual([100, 50]);
  });

  test('import per description and for one project only', async () => {
    const app = await api.call<Project>('POST', '/projects', {
      customerId: project.customerId,
      name: 'App',
    });
    const describe = (id: number, description: string): Promise<unknown> =>
      api.call('PATCH', `/time-entries/${id}`, { description });
    await describe((await entry('2026-03-02', 3600)).id, 'Design');
    await describe((await entry('2026-03-03', 1800)).id, 'Design');
    await describe((await entry('2026-03-04', 900)).id, 'Code');
    await entry('2026-03-05', 3600, app.body.id);

    const perName = await invoice({
      import: { ...IMPORT, projectId: project.id, grouping: 'description' },
    });
    expect(perName.body.items.map((i) => i.quantityHundredths)).toEqual([150, 25]);
    expect(perName.body.items[0]?.description).toStartWith('Web: Design (');

    const foreign = await api.seedProject({ customer: 'Other' });
    const res = await invoice({ import: { ...IMPORT, projectId: foreign.id } });
    expect(res.status).toBe(400);
  });

  test('a running time entry is never imported', async () => {
    const { body } = await api.call<{ started: Entry }>('POST', '/timer/start', {
      projectId: project.id,
    });
    const res = await invoice({ import: { ...IMPORT, from: '2000-01-01', to: '2999-12-31' } });
    expect(res.body.items).toEqual([]);
    expect(body.started.invoiceItemId).toBeNull();
  });

  test('invoiced entries are locked until their item is removed', async () => {
    const e = await entry('2026-03-02', 3600);
    const x = await expense('2026-03-02', 1000);
    const created = await invoice({ import: IMPORT });

    for (const res of [
      await api.call('PATCH', `/time-entries/${e.id}`, { durationSeconds: 60 }),
      await api.call('DELETE', `/time-entries/${e.id}`),
      await api.call('PATCH', `/expenses/${x.id}`, { amountMinor: 1 }),
      await api.call('DELETE', `/expenses/${x.id}`),
    ]) {
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('invoiced');
    }

    // A rate change on the project leaves invoiced entries alone
    await api.call('PATCH', `/projects/${project.id}`, {
      hourlyRateMinor: 1,
      applyToTimeEntries: { includeOverridden: true },
    });
    const [after] = (await api.call<{ hourlyRateMinor: number }[]>('GET', '/time-entries')).body;
    expect(after?.hourlyRateMinor).toBe(10000);

    // Keeping only the expense item releases the time entry
    const [timeItem, expenseItem] = created.body.items;
    const patched = await api.call<Invoice>('PATCH', `/invoices/${created.body.id}`, {
      items: [{ ...expenseItem, amountMinor: undefined }],
    });
    expect(patched.body.items.map((i) => i.id)).toEqual([expenseItem?.id ?? -1]);
    expect(timeItem).toBeDefined();
    expect((await api.call('DELETE', `/time-entries/${e.id}`)).status).toBe(204);
    expect((await api.call('DELETE', `/expenses/${x.id}`)).status).toBe(409);

    // Deleting the draft releases the rest
    expect((await api.call('DELETE', `/invoices/${created.body.id}`)).status).toBe(204);
    expect((await api.call('DELETE', `/expenses/${x.id}`)).status).toBe(204);
  });

  test('a today entry on an invoice cannot be continued', async () => {
    const { body } = await api.call<{ started: Entry }>('POST', '/timer/start', {
      projectId: project.id,
    });
    await api.call('POST', '/timer/stop', {});
    await api.call('PATCH', `/time-entries/${body.started.id}`, { durationSeconds: 3600 });
    await invoice({ import: { ...IMPORT, from: '2000-01-01', to: '2999-12-31' } });
    const res = await api.call('POST', '/timer/start', { timeEntryId: body.started.id });
    expect(res.status).toBe(409);
  });

  test('sent and paid lock the content, back to draft unlocks it', async () => {
    const { body } = await invoice({
      items: [{ description: 'Work', quantityHundredths: 100, unitPriceMinor: 100 }],
    });
    const path = `/invoices/${body.id}`;

    const sent = await api.call<Invoice>('PATCH', path, { sentOn: '2026-04-02' });
    expect(sent.body.status).toBe('sent');
    expect((await api.call('PATCH', path, { subject: 'x' })).body.code).toBe('invoice_locked');
    expect((await api.call('DELETE', path)).status).toBe(409);

    const paid = await api.call<Invoice>('PATCH', path, { paidOn: '2026-04-10' });
    expect(paid.body.status).toBe('paid');
    expect((await api.call('PATCH', path, { sentOn: null })).body.code).toBeUndefined();
    expect((await api.call('PATCH', path, { subject: 'x' })).status).toBe(409);

    const draft = await api.call<Invoice>('PATCH', path, {
      sentOn: null,
      paidOn: null,
      subject: 'Fixed',
    });
    expect(draft.body).toMatchObject({ status: 'draft', subject: 'Fixed' });
  });

  test.each([
    [{ dueDate: '2026-03-31' }, 'dueDate'],
    [{ periodFrom: '2026-03-10', periodTo: '2026-03-01' }, 'periodTo'],
    [{ taxBasisPoints: 10001 }, 'taxBasisPoints'],
    [{ customerId: 999 }, 'customerId'],
    [{ items: [{ description: ' ', quantityHundredths: 1, unitPriceMinor: 1 }] }, 'items'],
  ])('rejects %j', async (body, field) => {
    const res = await invoice(body);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain(field);
  });

  test('foreign item ids are rejected', async () => {
    const a = await invoice({
      items: [{ description: 'A', quantityHundredths: 1, unitPriceMinor: 1 }],
    });
    const b = await invoice();
    const res = await api.call('PATCH', `/invoices/${b.body.id}`, {
      items: [
        { id: a.body.items[0]?.id, description: 'A', quantityHundredths: 1, unitPriceMinor: 1 },
      ],
    });
    expect(res.status).toBe(400);
  });

  test('a customer with invoices cannot be deleted', async () => {
    await invoice();
    await api.call('DELETE', `/projects/${project.id}`);
    const res = await api.call('DELETE', `/customers/${project.customerId}`);
    expect(res.body.code).toBe('has_dependencies');
  });
});
