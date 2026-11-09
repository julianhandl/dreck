import { API_ERROR_CODES } from '@dreck/shared/api-errors';
import { z } from '@hono/zod-openapi';

/** Calendar date `YYYY-MM-DD`. */
export const DateSchema = z.iso.date().openapi({ example: '2026-11-09' });

/** Non-negative amount of money in minor units. */
export const RateSchema = z.number().int().min(0).openapi({ example: 9000 });

/** Name of a Customer or Project. */
export const NameSchema = z.string().trim().min(1).max(200);

/** Instant as ISO 8601 with offset (`Z` or `+01:00`); without offset the request fails. */
export const InstantSchema = z.iso
  .datetime({ offset: true })
  .openapi({ example: '2026-11-09T17:30:00+01:00' });

/** Optional `from`/`to` (both inclusive) plus Project and Customer filters. */
export const DateRangeFilterSchema = z.object({
  from: DateSchema.optional(),
  to: DateSchema.optional(),
  projectId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
});

export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>;

export const ErrorSchema = z
  .object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi('Error');

/** Body of every error response. */
export type ErrorBody = z.infer<typeof ErrorSchema>;

/** Rejects a PATCH body without any field. */
export function nonEmpty(body: Record<string, unknown>): boolean {
  return Object.keys(body).length > 0;
}
