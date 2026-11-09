import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { version } from '@root/package.json';
import { createApp } from '@/app';
import { openDatabase } from '@/db/db';
import { runMigrations } from '@/db/migrations/run-migrations';
import { loadSecret } from '@/features/auth/secret/load-secret';

// Same relative layout in the repo (src/main.ts, dist/server.js) and in the image
const MIGRATIONS_DIR = join(import.meta.dir, '..', 'drizzle');
const STATIC_DIR = join(import.meta.dir, '..', '..', 'frontend', 'dist');

const { values } = parseArgs({
  options: {
    'data-dir': { type: 'string', default: '/data' },
    port: { type: 'string', default: '3000' },
  },
});
const dataDir = resolve(values['data-dir']);
const port = Number(values.port);

try {
  console.log(`Dreck ${version}`);
  await mkdir(dataDir, { recursive: true });

  const { secret, generated } = await loadSecret(process.env.DRECK_SECRET, dataDir);
  if (generated) {
    console.log(`Generated a new secret (shown only now, stored in ${join(dataDir, 'secret')}):`);
    console.log(secret);
  }

  const db = openDatabase(join(dataDir, 'dreck.db'));
  const applied = await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR, backupDir: dataDir });
  if (applied.length > 0) console.log(`Applied migrations: ${applied.join(', ')}`);

  const app = createApp({ db, secret, dataDir, staticDir: STATIC_DIR });
  const server = Bun.serve({ port, fetch: app.fetch });
  console.log(`Listening on port ${port}`);

  const shutdown = async (): Promise<void> => {
    await server.stop();
    db.$client.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
