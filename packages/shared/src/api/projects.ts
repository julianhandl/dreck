import { z } from '@hono/zod-openapi';
import { DateSchema, NameSchema, nonEmpty, RateSchema } from './common';

export const ProjectSchema = z
  .object({
    id: z.number().int(),
    customerId: z.number().int(),
    name: z.string(),
    hourlyRateMinor: RateSchema,
    archived: z.boolean(),
  })
  .openapi('Project');

export type Project = z.infer<typeof ProjectSchema>;

/** Range and scope for taking over a new Hourly Rate; shared with the Customer endpoint. */
export const ApplyRateSchema = z.object({
  from: DateSchema.optional(),
  to: DateSchema.optional(),
  includeOverridden: z
    .boolean()
    .optional()
    .openapi({ description: 'Also overwrite Time Entries corrected by hand' }),
});

export const CreateProjectSchema = z.object({
  customerId: z.number().int().positive(),
  name: NameSchema,
  hourlyRateMinor: RateSchema.optional().openapi({
    description: 'Defaults to the Hourly Rate of the Customer',
  }),
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z
  .object({
    customerId: z.number().int().positive(),
    name: NameSchema,
    hourlyRateMinor: RateSchema,
    archived: z.boolean(),
    applyToTimeEntries: ApplyRateSchema.openapi({
      description: 'Existing Time Entries that take over the new Hourly Rate',
    }),
  })
  .partial()
  .refine(nonEmpty, 'Nothing to change')
  .refine((b) => b.applyToTimeEntries === undefined || b.hourlyRateMinor !== undefined, {
    message: 'applyToTimeEntries requires hourlyRateMinor',
    path: ['applyToTimeEntries'],
  });

export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
