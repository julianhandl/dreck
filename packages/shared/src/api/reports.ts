import { ROUNDING_MINUTES } from '@dreck/shared/report';
import { z } from '@hono/zod-openapi';
import { DateSchema } from './common';

const SumsSchema = z.object({
  seconds: z.number().int().openapi({ description: 'Exact seconds' }),
  roundedSeconds: z.number().int().openapi({ description: 'Seconds after Rounding' }),
  amountMinor: z.number().int().openapi({ description: 'Amount of the billable time' }),
  nonBillableSeconds: z
    .number()
    .int()
    .openapi({ description: 'Rounded seconds of non-billable Tasks, part of roundedSeconds' }),
  billableExpensesMinor: z.number().int(),
  ownExpensesMinor: z.number().int(),
});

const NamedSchema = z.object({ id: z.number().int(), name: z.string(), archived: z.boolean() });

export const ReportSchema = z
  .object({
    from: DateSchema,
    to: DateSchema,
    customerId: z.number().int().optional(),
    projectId: z.number().int().optional(),
    currency: z.string(),
    roundingMinutes: z.literal(ROUNDING_MINUTES),
    totals: SumsSchema,
    customers: z.array(
      NamedSchema.extend(SumsSchema.shape).extend({
        projects: z.array(NamedSchema.extend(SumsSchema.shape)),
      }),
    ),
  })
  .openapi('Report');

export type Report = z.infer<typeof ReportSchema>;

export const ReportQuerySchema = z.object({
  from: DateSchema,
  to: DateSchema,
  customerId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  format: z.enum(['json', 'csv']).optional().openapi({
    description: 'csv returns the same filters as CSV; `Accept: text/csv` does the same',
  }),
});

export type ReportQuery = z.infer<typeof ReportQuerySchema>;
