import type { Settings as SettingsResponse } from '@dreck/shared/api/settings';
import type { DefaultTask } from '@dreck/shared/api/tasks';
import { eq } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { customers } from '@/features/customers/customers.table';
import { expenses } from '@/features/expenses/expenses.table';
import { listDefaultTasks, replaceDefaultTasks } from '@/features/tasks/tasks.service';
import { ApiError } from '@/http/api-error';
import { settings } from './settings.table';

export type Settings = Omit<typeof settings.$inferSelect, 'id'>;

const OPTIONAL_TEXTS = [
  'senderName',
  'senderAddress',
  'senderVatId',
  'defaultInvoiceNotes',
] as const satisfies (keyof Settings)[];

/** Reads the single settings row. */
export function getSettings(db: Db): Settings {
  const row = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!row) throw new Error('Settings row is missing, migrations did not run');
  const { id: _, ...rest } = row;
  return rest;
}

/** The settings with the Default Tasks, as the API returns them. */
export function getSettingsResponse(db: Db): SettingsResponse {
  return { ...getSettings(db), defaultTasks: listDefaultTasks(db) };
}

/**
 * Updates settings and replaces the Default Tasks if given; the currency is locked once a
 * Customer or an Expense exists.
 */
export function updateSettings(
  db: Db,
  { defaultTasks, ...changes }: Partial<Settings> & { defaultTasks?: DefaultTask[] },
): SettingsResponse {
  // An emptied text field is stored as NULL
  for (const key of OPTIONAL_TEXTS) {
    if (changes[key] !== undefined) changes[key] = changes[key] || null;
  }
  return db.transaction((tx) => {
    if (changes.currency !== undefined && changes.currency !== getSettings(tx).currency) {
      const inUse =
        tx.select({ id: customers.id }).from(customers).limit(1).get() ??
        tx.select({ id: expenses.id }).from(expenses).limit(1).get();
      if (inUse) {
        throw new ApiError(
          'currency_locked',
          'The currency cannot change once customers or expenses exist',
        );
      }
    }
    if (Object.keys(changes).length > 0) {
      tx.update(settings).set(changes).where(eq(settings.id, 1)).run();
    }
    if (defaultTasks) replaceDefaultTasks(tx, defaultTasks);
    return getSettingsResponse(tx);
  });
}
