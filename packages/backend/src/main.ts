import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { version } from '@root/package.json';
import { createApp } from '@/app';
import { loadConfig } from '@/config';
import { openDatabase } from '@/db/db';
import { runMigrations } from '@/db/migrations/run-migrations';
import { loadSecret } from '@/features/auth/secret/load-secret';

// Same relative layout in the repo (src/main.ts, dist/server.js) and in the image
const MIGRATIONS_DIR = join(import.meta.dir, '..', 'drizzle');
const STATIC_DIR = join(import.meta.dir, '..', '..', 'frontend', 'dist');

try {
  console.log(`Dreck ${version}`);
  const { port, dataDir, ...secretSource } = loadConfig(process.argv.slice(2), process.env);
  await mkdir(dataDir, { recursive: true });

  const { secret, generated } = await loadSecret(secretSource, dataDir);
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
