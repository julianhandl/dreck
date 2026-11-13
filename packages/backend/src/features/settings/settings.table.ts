import type { Language } from '@dreck/shared/i18n';
import type { RoundingMinutes } from '@dreck/shared/report';
import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Instance settings, always exactly one row with id 1 (created by the first migrations). */
export const settings = sqliteTable(
  'settings',
  {
    id: integer('id').primaryKey(),
    currency: text('currency').notNull(),
    defaultHourlyRateMinor: integer('default_hourly_rate_minor').notNull(),
    roundingMinutes: integer('rounding_minutes').$type<RoundingMinutes>().notNull(),
    language: text('language').$type<Language>().notNull(),
    timezone: text('timezone').notNull(),
    senderName: text('sender_name'),
    senderAddress: text('sender_address'),
    senderVatId: text('sender_vat_id'),
    defaultTaxBasisPoints: integer('default_tax_basis_points').notNull().default(0),
    defaultInvoiceNotes: text('default_invoice_notes'),
  },
  (t) => [
    check('settings_single_row', sql`${t.id} = 1`),
    check('settings_rate_not_negative', sql`${t.defaultHourlyRateMinor} >= 0`),
    check('settings_rounding', sql`${t.roundingMinutes} IN (0, 5, 6, 10, 15, 30, 60)`),
    check('settings_language', sql`${t.language} IN ('de', 'en')`),
  ],
);
