import { expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { createTestApp } from '@/test/test-app';

test('GET /backup streams a SQLite snapshot and removes the temp file', async () => {
  const api = await createTestApp();
  await api.seedProject();
  const res = await api.app.request('/api/v1/backup', {
    headers: { Authorization: 'Bearer test-secret-with-at-least-32-characters' },
  });
  expect(res.status).toBe(200);
  expect(res.headers.get('content-disposition')).toMatch(
    /^attachment; filename="dreck-backup_\d{4}-\d{2}-\d{2}\.db"$/,
  );
  const header = new TextDecoder().decode((await res.arrayBuffer()).slice(0, 15));
  expect(header).toBe('SQLite format 3');
  expect(await readdir(api.dataDir)).toEqual([]);
});

test('GET /backup needs auth', async () => {
  const api = await createTestApp();
  expect((await api.app.request('/api/v1/backup')).status).toBe(401);
});
