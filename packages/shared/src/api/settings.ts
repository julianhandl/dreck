import { LANGUAGES } from '@dreck/shared/i18n';
import { ROUNDING_MINUTES } from '@dreck/shared/report';
import { z } from '@hono/zod-openapi';
import { nonEmpty, RateSchema } from './common';
import { BasisPointsSchema } from './invoices';
import { DefaultTaskListSchema } from './tasks';

const OptionalTextSchema = z.string().trim().max(5000).nullable();

const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));
const TIME_ZONES = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);

export const SettingsSchema = z
  .object({
    currency: z
      .string()
      .refine((c) => CURRENCIES.has(c), 'Unknown ISO 4217 currency')
      .openapi({ example: 'EUR' }),
    defaultHourlyRateMinor: RateSchema,
    roundingMinutes: z.literal(ROUNDING_MINUTES),
    language: z.enum(LANGUAGES),
    timezone: z
      .string()
      .refine((tz) => TIME_ZONES.has(tz), 'Unknown IANA time zone')
      .openapi({ example: 'Europe/Vienna' }),
    senderName: OptionalTextSchema.openapi({ description: 'Your name on invoices' }),
    senderAddress: OptionalTextSchema.openapi({ description: 'Your address on invoices' }),
    senderVatId: OptionalTextSchema.openapi({ description: 'Your VAT ID (UID) on invoices' }),
    defaultTaxBasisPoints: BasisPointsSchema.openapi({ description: 'Tax of new invoices' }),
    defaultInvoiceNotes: OptionalTextSchema.openapi({
      description: 'Text below the items of new invoices, e.g. bank details',
    }),
    defaultTasks: DefaultTaskListSchema.openapi({
      description: 'Tasks a new Project copies, sorted by name; PATCH replaces the list',
    }),
  })
  .openapi('Settings');

export type Settings = z.infer<typeof SettingsSchema>;

export const UpdateSettingsSchema = SettingsSchema.partial().refine(nonEmpty, 'Nothing to change');

export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;
