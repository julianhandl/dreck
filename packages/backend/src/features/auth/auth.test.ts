import { afterEach, beforeEach, describe, expect, setSystemTime, test } from 'bun:test';
import { createApp } from '@/app';
import { openDatabase } from '@/db/db';
import { runMigrations } from '@/db/migrations/run-migrations';
import { createTestApp, MIGRATIONS_DIR, TEST_SECRET } from '@/test/test-app';

let api: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  api = await createTestApp();
});
afterEach(() => {
  setSystemTime();
});

const request = (path: string, init: RequestInit = {}, host = 'localhost'): Promise<Response> =>
  Promise.resolve(api.app.request(`http://${host}/api/v1${path}`, init));

const login = (password: string, host = 'localhost'): Promise<Response> =>
  request(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: `http://${host}` },
      body: JSON.stringify({ password }),
    },
    host,
  );

/** `name=value` part of the Set-Cookie header. */
const cookieOf = (res: Response): string => res.headers.get('set-cookie')?.split(';')[0] ?? '';

describe('auth', () => {
  test('without credentials every endpoint is 401', async () => {
    const res = await request('/customers');
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'unauthorized' });
  });

  test('a wrong bearer token is 401', async () => {
    const res = await request('/customers', { headers: { Authorization: 'Bearer nope' } });
    expect(res.status).toBe(401);
  });

  test('health and openapi.json need no auth', async () => {
    expect((await api.app.request('/api/health')).status).toBe(200);
    expect((await request('/openapi.json')).status).toBe(200);
  });

  test('login sets a 90-day HttpOnly SameSite=Strict cookie that grants access', async () => {
    const res = await login(TEST_SECRET);
    expect(res.status).toBe(204);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain(`Max-Age=${90 * 24 * 3600}`);
    expect(setCookie).not.toContain('Secure');

    const res2 = await request('/customers', { headers: { Cookie: cookieOf(res) } });
    expect(res2.status).toBe(200);
  });

  test('the cookie is Secure on other hosts than localhost', async () => {
    const res = await login(TEST_SECRET, 'dreck.example.com');
    expect(res.headers.get('set-cookie')).toContain('Secure');
  });

  test('the cookie expires after 90 days', async () => {
    const cookie = cookieOf(await login(TEST_SECRET));
    setSystemTime(new Date(Date.now() + 91 * 24 * 3600 * 1000));
    expect((await request('/customers', { headers: { Cookie: cookie } })).status).toBe(401);
  });

  test('a new secret invalidates every session', async () => {
    const cookie = cookieOf(await login(TEST_SECRET));
    const db = openDatabase(':memory:');
    await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR });
    const other = createApp({ db, secret: 'another-secret-with-at-least-32-chars', dataDir: '' });
    const res = await other.request('/api/v1/customers', { headers: { Cookie: cookie } });
    expect(res.status).toBe(401);
  });

  test('logout deletes the cookie', async () => {
    const res = await request('/auth/logout', {
      method: 'POST',
      headers: { Origin: 'http://localhost' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  test('wrong password is 401', async () => {
    expect((await login('wrong')).status).toBe(401);
  });

  test('cookie requests from a foreign origin are rejected (CSRF)', async () => {
    const cookie = cookieOf(await login(TEST_SECRET));
    const res = await request('/customers', {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'text/plain', Origin: 'https://evil.example' },
      body: JSON.stringify({ name: 'X' }),
    });
    expect(res.status).toBe(403);
  });

  describe('login brake', () => {
    test('from 10 failures per minute every attempt is 429 with Retry-After', async () => {
      setSystemTime(new Date('2026-03-02T09:00:00Z'));
      for (let i = 0; i < 5; i++) await login('wrong');
      for (let i = 0; i < 5; i++) {
        await request('/customers', { headers: { Authorization: 'Bearer wrong' } });
      }

      const blocked = await login(TEST_SECRET);
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get('retry-after')).toBe('60');
      expect(await blocked.json()).toMatchObject({ code: 'rate_limited' });
      const bearer = await request('/customers', {
        headers: { Authorization: `Bearer ${TEST_SECRET}` },
      });
      expect(bearer.status).toBe(429);

      setSystemTime(new Date('2026-03-02T09:01:01Z'));
      expect((await login(TEST_SECRET)).status).toBe(204);
    });

    test('9 failures do not block', async () => {
      for (let i = 0; i < 9; i++) await login('wrong');
      expect((await login(TEST_SECRET)).status).toBe(204);
    });
  });
});
