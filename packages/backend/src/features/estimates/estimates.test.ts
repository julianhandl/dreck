import { beforeEach, describe, expect, test } from 'bun:test';
import type { Estimate } from '@dreck/shared/api/estimates';
import { createTestApp, type Project } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
let project: Project;
beforeEach(async () => {
  api = await createTestApp();
  project = await api.seedProject({ rate: 10000, customer: 'Acme', name: 'Web' });
});

const estimate = (body: Record<string, unknown> = {}): ReturnType<typeof api.call<Estimate>> =>
  api.call<Estimate>('POST', '/estimates', {
    customerId: project.customerId,
    issueDate: '2026-04-01',
    ...body,
  });

const patch = (id: number, body: Record<string, unknown>): ReturnType<typeof api.call<Estimate>> =>
  api.call<Estimate>('PATCH', `/estimates/${id}`, body);

const ITEM = { description: 'Design', quantityHundredths: 100, unitPriceMinor: 10000 };

describe('estimates', () => {
  test('a draft copies recipient, notes and tax and numbers itself', async () => {
    await api.call('PATCH', `/customers/${project.customerId}`, {
      address: 'Main St 1\n1010 Wien',
    });
    await api.call('PATCH', '/settings', {
      defaultTaxBasisPoints: 2000,
      defaultEstimateNotes: 'Valid 30 days',
    });
    const first = await estimate();
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      number: '1',
      recipient: 'Acme\nMain St 1\n1010 Wien',
      notes: 'Valid 30 days',
      taxBasisPoints: 2000,
      discountBasisPoints: 0,
      validUntil: null,
      status: 'draft',
      items: [],
      totalMinor: 0,
    });
    await estimate({ number: 'AN-2026-004' });
    expect((await estimate()).body.number).toBe('AN-2026-005');
  });

  test('empty subject and notes are stored as null', async () => {
    const res = await estimate({ subject: '', notes: '' });
    expect(res.body).toMatchObject({ subject: null, notes: null });
  });

  test('number_taken is case-insensitive among estimates, invoices may share it', async () => {
    await estimate({ number: 'AN-1' });
    const dup = await estimate({ number: 'an-1' });
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ code: 'number_taken' });
    await api.call('POST', '/invoices', {
      customerId: project.customerId,
      number: 'RE-1',
      issueDate: '2026-04-01',
      dueDate: '2026-04-15',
    });
    expect((await estimate({ number: 'RE-1' })).status).toBe(201);
    const other = (await estimate()).body;
    expect((await patch(other.id, { number: 'AN-1' })).status).toBe(409);
    expect((await patch(other.id, { number: other.number })).status).toBe(200);
  });

  test('totals: discount, then tax', async () => {
    const res = await estimate({
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

  test('items are replaced: changed, new, removed; a foreign id is rejected', async () => {
    const created = (
      await estimate({
        items: [ITEM, { ...ITEM, description: 'Old' }, { ...ITEM, description: 'Gone' }],
      })
    ).body;
    const [a, b] = created.items;
    const res = await patch(created.id, {
      items: [
        { ...ITEM, id: a?.id, description: 'Changed' },
        { ...ITEM, id: b?.id },
        { ...ITEM, description: 'New' },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.items.map((i) => i.description)).toEqual(['Changed', 'Design', 'New']);
    expect(res.body.items[0]?.id).toBe(a?.id);

    const other = (await estimate({ items: [ITEM] })).body;
    const foreign = await patch(created.id, { items: [{ ...ITEM, id: other.items[0]?.id }] });
    expect(foreign.status).toBe(400);
    const dup = await patch(created.id, {
      items: [
        { ...ITEM, id: a?.id },
        { ...ITEM, id: a?.id },
      ],
    });
    expect(dup.status).toBe(400);
  });

  test('status comes from the dates; accepted and declined together is 400', async () => {
    const { id } = (await estimate()).body;
    expect((await patch(id, { sentOn: '2026-04-02' })).body.status).toBe('sent');
    expect((await patch(id, { declinedOn: '2026-04-03' })).body.status).toBe('declined');
    expect((await patch(id, { declinedOn: null, acceptedOn: '2026-04-04' })).body.status).toBe(
      'accepted',
    );
    const both = await patch(id, { declinedOn: '2026-04-05' });
    expect(both.status).toBe(400);
    expect(JSON.stringify(both.body)).toContain('declinedOn');
    // accepted without sentOn is allowed
    const bare = (await estimate()).body;
    expect((await patch(bare.id, { acceptedOn: '2026-04-02' })).body.status).toBe('accepted');
  });

  test.each([
    ['sent', { sentOn: '2026-04-02' }],
    ['accepted', { sentOn: '2026-04-02', acceptedOn: '2026-04-03' }],
    ['declined', { sentOn: '2026-04-02', declinedOn: '2026-04-03' }],
  ])('a %s estimate is locked', async (_, dates) => {
    const { id } = (await estimate({ items: [ITEM] })).body;
    await patch(id, dates);
    for (const body of [{ subject: 'x' }, { items: [] }, { number: 'X-1' }]) {
      const res = await patch(id, body);
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ code: 'estimate_locked' });
    }
    // only status fields: allowed
    expect((await patch(id, { sentOn: '2026-04-05' })).status).toBe(200);
    // back to draft together with content: allowed
    const back = await patch(id, {
      sentOn: null,
      acceptedOn: null,
      declinedOn: null,
      subject: 'Edited',
    });
    expect(back.status).toBe(200);
    expect(back.body).toMatchObject({ status: 'draft', subject: 'Edited' });
  });

  test('validUntil before issueDate is 400', async () => {
    const res = await estimate({ validUntil: '2026-03-31' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('validUntil');
    const { id } = (await estimate({ validUntil: '2026-04-30' })).body;
    expect((await patch(id, { validUntil: '2026-03-01' })).status).toBe(400);
    expect((await patch(id, { issueDate: '2026-05-01' })).status).toBe(400);
    expect((await patch(id, { validUntil: null })).body.validUntil).toBeNull();
  });

  test('delete works in every status, with items, then 404', async () => {
    for (const dates of [{}, { sentOn: '2026-04-02' }, { acceptedOn: '2026-04-02' }]) {
      const { id } = (await estimate({ items: [ITEM, ITEM] })).body;
      await patch(id, dates);
      expect((await api.call('DELETE', `/estimates/${id}`)).status).toBe(204);
      expect((await api.call('DELETE', `/estimates/${id}`)).status).toBe(404);
      expect((await patch(id, { subject: 'x' })).status).toBe(404);
    }
  });

  test('list: issue date descending, then id descending', async () => {
    const a = (await estimate({ issueDate: '2026-04-01' })).body;
    const b = (await estimate({ issueDate: '2026-05-01' })).body;
    const c = (await estimate({ issueDate: '2026-04-01' })).body;
    const list = await api.call<Estimate[]>('GET', '/estimates');
    expect(list.body.map((e) => e.id)).toEqual([b.id, c.id, a.id]);
  });

  test('a customer with an estimate cannot be deleted', async () => {
    await estimate();
    const res = await api.call('DELETE', `/customers/${project.customerId}`);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'has_dependencies' });
  });

  test('unknown customer is 400, unknown estimate is 404', async () => {
    const res = await estimate({ customerId: 9999 });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('customerId');
    expect((await patch(9999, { subject: 'x' })).status).toBe(404);
  });

  test('defaultEstimateNotes: set, cleared to null with an empty string', async () => {
    const set = await api.call('PATCH', '/settings', { defaultEstimateNotes: 'Terms' });
    expect(set.body).toMatchObject({ defaultEstimateNotes: 'Terms' });
    const cleared = await api.call('PATCH', '/settings', { defaultEstimateNotes: '' });
    expect(cleared.body).toMatchObject({ defaultEstimateNotes: null });
  });
});
