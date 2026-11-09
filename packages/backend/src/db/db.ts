import { Database } from 'bun:sqlite';
import { type BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

/** Database handle or transaction; services accept both. */
export type Db = BaseSQLiteDatabase<'sync', void>;

/** Opens the SQLite file (or `:memory:`) with WAL and foreign keys. */
export function openDatabase(path: string): BunSQLiteDatabase & { $client: Database } {
  const sqlite = new Database(path, { create: true });
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA foreign_keys = ON');
  return drizzle({ client: sqlite });
}
