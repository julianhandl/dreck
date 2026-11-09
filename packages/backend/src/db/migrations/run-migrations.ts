import type { Database } from 'bun:sqlite';
import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

const KEPT_BACKUPS = 3;
const BACKUP_PREFIX = 'backup-before-';

type Journal = { entries: { tag: string; when: number }[] };

type MigrationOptions = {
  migrationsFolder: string;
  /** Directory for `backup-before-*.db`; without it no backup is written (tests with `:memory:`). */
  backupDir?: string;
};

/**
 * Applies pending migrations. Writes a backup first if the database already has migrations,
 * keeps the last 3 backups and aborts without changes if the database is newer than this build.
 * Returns the tags of the applied migrations.
 */
export async function runMigrations(
  db: BunSQLiteDatabase & { $client: Database },
  { migrationsFolder, backupDir }: MigrationOptions,
): Promise<string[]> {
  const journal: Journal = await Bun.file(join(migrationsFolder, 'meta/_journal.json')).json();
  const applied = appliedMigrationTimes(db.$client);

  const known = new Set(journal.entries.map((e) => e.when));
  if (applied.some((when) => !known.has(when))) {
    throw new Error(
      'The database contains migrations unknown to this version. It was written by a newer version of Dreck. Nothing was changed.',
    );
  }

  const lastApplied = Math.max(0, ...applied);
  const pending = journal.entries.filter((e) => e.when > lastApplied);
  if (pending.length === 0) return [];

  const lastAppliedTag = journal.entries.find((e) => e.when === lastApplied)?.tag;
  if (backupDir && lastAppliedTag) {
    const backupPath = join(backupDir, `${BACKUP_PREFIX}${lastAppliedTag}.db`);
    await rm(backupPath, { force: true });
    db.$client.run('VACUUM INTO ?', [backupPath]);
    await removeOldBackups(backupDir);
  }

  migrate(db, { migrationsFolder });
  return pending.map((e) => e.tag);
}

function appliedMigrationTimes(sqlite: Database): number[] {
  const table = sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
    .get();
  if (!table) return [];
  return sqlite
    .query<{ created_at: number }, []>('SELECT created_at FROM __drizzle_migrations')
    .all()
    .map((row) => Number(row.created_at));
}

async function removeOldBackups(dir: string): Promise<void> {
  const names = (await readdir(dir)).filter(
    (n) => n.startsWith(BACKUP_PREFIX) && n.endsWith('.db'),
  );
  const backups = await Promise.all(
    names.map(async (name) => ({ name, mtime: (await stat(join(dir, name))).mtimeMs })),
  );
  backups.sort((a, b) => b.mtime - a.mtime);
  await Promise.all(backups.slice(KEPT_BACKUPS).map((b) => rm(join(dir, b.name))));
}
