import { z } from '@hono/zod-openapi';
import { DateSchema, NameSchema, nonEmpty, RateSchema } from './common';
import { TaskListSchema, TaskSchema } from './tasks';

export const ProjectSchema = z
  .object({
    id: z.number().int(),
    customerId: z.number().int(),
    name: z.string(),
    hourlyRateMinor: RateSchema,
    archived: z.boolean(),
    tasks: z.array(TaskSchema).openapi({ description: 'Including Archived, sorted by name' }),
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
  tasks: TaskListSchema.optional().openapi({ description: 'Defaults to the Default Tasks' }),
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z
  .object({
    customerId: z.number().int().positive(),
    name: NameSchema,
    hourlyRateMinor: RateSchema,
    archived: z.boolean(),
    tasks: TaskListSchema.openapi({
      description:
        'Replaces the list: Tasks with id change, without id are new, missing ones are deleted or, if they have Time Entries, archived',
    }),
    applyToTimeEntries: ApplyRateSchema.openapi({
      description:
        'Existing Time Entries whose Hourly Rate (of the Project or of their Task) changes take it over',
    }),
  })
  .partial()
  .refine(nonEmpty, 'Nothing to change')
  .refine(
    (b) =>
      b.applyToTimeEntries === undefined ||
      b.hourlyRateMinor !== undefined ||
      b.tasks !== undefined,
    {
      message: 'applyToTimeEntries requires hourlyRateMinor or tasks',
      path: ['applyToTimeEntries'],
    },
  );

export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
