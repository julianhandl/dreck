import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '@/app';
import { openDatabase } from '@/db/db';
import { runMigrations } from '@/db/migrations/run-migrations';

export const TEST_SECRET = 'test-secret-with-at-least-32-characters';
export const MIGRATIONS_DIR = join(import.meta.dir, '..', '..', 'drizzle');

type ApiResponse<T> = { status: number; body: T; headers: Headers };

type Api = {
  app: ReturnType<typeof createApp>;
  dataDir: string;
  /** Calls `/api/v1<path>` with the Bearer secret and parses JSON. */
  call: <T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
  ) => Promise<ApiResponse<T>>;
  /** Creates a Customer with one Project and returns the Project. */
  seedProject: (input?: { rate?: number; customer?: string; name?: string }) => Promise<Project>;
};

export type Project = { id: number; customerId: number; name: string; hourlyRateMinor: number };

/** App with a fresh, migrated `:memory:` database and a temp data dir. */
export async function createTestApp(): Promise<Api> {
  const db = openDatabase(':memory:');
  await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR });
  const dataDir = await mkdtemp(join(tmpdir(), 'dreck-test-'));
  const app = createApp({ db, secret: TEST_SECRET, dataDir });

  const call: Api['call'] = async (method, path, body) => {
    const res = await app.request(`/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
  };

  let seeded = 0;
  const seedProject: Api['seedProject'] = async ({ rate = 9000, customer, name = 'Web' } = {}) => {
    seeded += 1;
    const c = await call<{ id: number }>('POST', '/customers', {
      name: customer ?? `Customer ${seeded}`,
      hourlyRateMinor: rate,
    });
    const p = await call<Project>('POST', '/projects', { customerId: c.body.id, name });
    return p.body;
  };

  return { app, dataDir, call, seedProject };
}
