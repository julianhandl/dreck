import { beforeEach, describe, expect, test } from 'bun:test';
import { createTestApp } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  api = await createTestApp();
});

describe('settings', () => {
  test('the first migration creates the defaults', async () => {
    const res = await api.call('GET', '/settings');
    expect(res.body).toEqual({
      currency: 'EUR',
      defaultHourlyRateMinor: 0,
      roundingMinutes: 0,
      language: 'de',
      timezone: 'UTC',
      senderName: null,
      senderAddress: null,
      senderVatId: null,
      defaultTaxBasisPoints: 0,
      defaultInvoiceNotes: null,
    });
  });

  test('emptied invoice texts become null', async () => {
    await api.call('PATCH', '/settings', { senderName: 'Julia Muster', senderVatId: 'ATU1' });
    const res = await api.call('PATCH', '/settings', { senderVatId: '  ' });
    expect(res.body).toMatchObject({ senderName: 'Julia Muster', senderVatId: null });
  });

  test('PATCH changes single fields', async () => {
    const res = await api.call('PATCH', '/settings', {
      roundingMinutes: 15,
      timezone: 'Europe/Vienna',
      language: 'en',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      roundingMinutes: 15,
      timezone: 'Europe/Vienna',
      language: 'en',
    });
  });

  test.each([
    { roundingMinutes: 7 },
    { timezone: 'Mars/Olympus' },
    { currency: 'XYZ1' },
    { language: 'fr' },
    { defaultHourlyRateMinor: -1 },
    {},
  ])('rejects %j with validation_failed', async (body) => {
    const res = await api.call('PATCH', '/settings', body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_failed');
  });

  test('currency is changeable while there is no customer and no expense', async () => {
    const res = await api.call('PATCH', '/settings', { currency: 'JPY' });
    expect(res.body.currency).toBe('JPY');
  });

  test('currency is locked once a customer exists', async () => {
    await api.call('POST', '/customers', { name: 'Acme' });
    const res = await api.call('PATCH', '/settings', { currency: 'USD' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('currency_locked');
    // Sending the unchanged currency is fine
    expect((await api.call('PATCH', '/settings', { currency: 'EUR' })).status).toBe(200);
  });
});
