import { expect, test } from 'bun:test';
import { createTestApp } from '@/test/test-app';

test('GET /api/health', async () => {
  const { app } = await createTestApp();
  const res = await app.request('/api/health');
  expect(await res.json()).toEqual({ ok: true });
});

test('unknown API paths are 404 not_found', async () => {
  const { app } = await createTestApp();
  const res = await app.request('/api/v1/nope', {
    headers: { Authorization: 'Bearer test-secret-with-at-least-32-characters' },
  });
  expect(res.status).toBe(404);
  expect(await res.json()).toMatchObject({ code: 'not_found' });
});

test('malformed JSON is 400 validation_failed', async () => {
  const { app } = await createTestApp();
  const res = await app.request('/api/v1/customers', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-secret-with-at-least-32-characters',
      'Content-Type': 'application/json',
    },
    body: '{',
  });
  expect(res.status).toBe(400);
  expect(await res.json()).toMatchObject({ code: 'validation_failed' });
});

test('openapi.json snapshot', async () => {
  const { app } = await createTestApp();
  const res = await app.request('/api/v1/openapi.json');
  expect(await res.json()).toMatchSnapshot();
});
