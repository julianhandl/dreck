import { describe, expect, test } from 'bun:test';
import { cp, mkdtemp, readdir, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '@/db/db';
import { MIGRATIONS_DIR } from '@/test/test-app';
import { runMigrations } from './run-migrations';

type Journal = { entries: { tag: string }[] };

const tempDir = (): Promise<string> => mkdtemp(join(tmpdir(), 'dreck-migrations-'));

/** Copy of the migrations folder with only the first `count` migrations in the journal. */
async function migrationsUpTo(count: number): Promise<string> {
  const dir = await tempDir();
  await cp(MIGRATIONS_DIR, dir, { recursive: true });
  const journal: Journal = await Bun.file(join(MIGRATIONS_DIR, 'meta/_journal.json')).json();
  journal.entries = journal.entries.slice(0, count);
  await writeFile(join(dir, 'meta/_journal.json'), JSON.stringify(journal));
  return dir;
}

const backups = async (dir: string): Promise<string[]> =>
  (await readdir(dir)).filter((n) => n.startsWith('backup-before-')).sort();

describe('runMigrations', () => {
  test('a fresh database gets all migrations without a backup', async () => {
    const dir = await tempDir();
    const db = openDatabase(join(dir, 'dreck.db'));
    const applied = await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR, backupDir: dir });
    expect(applied).toEqual(['0000_init', '0001_seed-settings']);
    expect(await backups(dir)).toEqual([]);
    expect(await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR, backupDir: dir })).toEqual(
      [],
    );
  });

  test('pending migrations write a backup named after the last applied one first', async () => {
    const dir = await tempDir();
    const db = openDatabase(join(dir, 'dreck.db'));
    await runMigrations(db, { migrationsFolder: await migrationsUpTo(1), backupDir: dir });

    const applied = await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR, backupDir: dir });
    expect(applied).toEqual(['0001_seed-settings']);
    expect(await backups(dir)).toEqual(['backup-before-0000_init.db']);

    // The backup holds the state before the migration
    const backup = openDatabase(join(dir, 'backup-before-0000_init.db'));
    expect(backup.$client.query('SELECT count(*) AS n FROM settings').get()).toEqual({ n: 0 });
  });

  test('keeps only the last 3 backups', async () => {
    const dir = await tempDir();
    for (const [i, name] of ['a', 'b', 'c'].entries()) {
      const file = join(dir, `backup-before-${name}.db`);
      await writeFile(file, '');
      await utimes(file, new Date(2020, 0, i + 1), new Date(2020, 0, i + 1));
    }
    const db = openDatabase(join(dir, 'dreck.db'));
    await runMigrations(db, { migrationsFolder: await migrationsUpTo(1), backupDir: dir });
    await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR, backupDir: dir });
    expect(await backups(dir)).toEqual([
      'backup-before-0000_init.db',
      'backup-before-b.db',
      'backup-before-c.db',
    ]);
  });

  test('aborts without changes when the database is newer than this build', async () => {
    const dir = await tempDir();
    const db = openDatabase(join(dir, 'dreck.db'));
    await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR, backupDir: dir });

    const older = await migrationsUpTo(1);
    await expect(runMigrations(db, { migrationsFolder: older, backupDir: dir })).rejects.toThrow(
      'newer version',
    );
    expect(await backups(dir)).toEqual([]);
  });
});
