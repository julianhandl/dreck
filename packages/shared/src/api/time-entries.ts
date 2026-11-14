import { z } from '@hono/zod-openapi';
import { DateSchema, InstantSchema, InvoiceItemIdSchema, nonEmpty, RateSchema } from './common';

const DescriptionSchema = z.string().trim().max(2000);
const DurationSchema = z.number().int().min(0).openapi({ example: 5400 });

export const TimeEntrySchema = z
  .object({
    id: z.number().int(),
    projectId: z.number().int(),
    taskId: z.number().int().nullable(),
    date: DateSchema,
    durationSeconds: DurationSchema.openapi({
      description: 'Without the running part; clients add `now − runningSince` while it runs',
    }),
    runningSince: z.iso.datetime().nullable().openapi({ description: 'UTC, set while it runs' }),
    description: z.string().nullable(),
    hourlyRateMinor: RateSchema,
    hourlyRateOverridden: z.boolean().openapi({ description: 'Hourly Rate corrected by hand' }),
    invoiceItemId: InvoiceItemIdSchema,
  })
  .openapi('TimeEntry');

export type TimeEntry = z.infer<typeof TimeEntrySchema>;

const TaskIdSchema = z.number().int().positive().openapi({
  description: 'Task of the Project; its own Hourly Rate wins over the rate of the Project',
});

export const CreateTimeEntrySchema = z.object({
  projectId: z.number().int().positive(),
  taskId: TaskIdSchema.optional(),
  date: DateSchema,
  durationSeconds: DurationSchema,
  description: DescriptionSchema.optional(),
});

export type CreateTimeEntry = z.infer<typeof CreateTimeEntrySchema>;

export const UpdateTimeEntrySchema = z
  .object({
    projectId: z.number().int().positive().openapi({
      description:
        'Takes over the rate of the new project unless hourlyRateMinor is sent along; without taskId the Task is removed',
    }),
    taskId: TaskIdSchema.nullable().openapi({
      description: 'Takes over the rate of the Task unless hourlyRateMinor is sent along',
    }),
    date: DateSchema,
    durationSeconds: DurationSchema.openapi({
      description: 'On a running entry this sets the displayed total duration',
    }),
    description: DescriptionSchema.nullable(),
    hourlyRateMinor: RateSchema.openapi({ description: 'Marks the entry as corrected by hand' }),
  })
  .partial()
  .refine(nonEmpty, 'Nothing to change');

export type UpdateTimeEntry = z.infer<typeof UpdateTimeEntrySchema>;

const AtSchema = InstantSchema.optional().openapi({
  description: 'Moment of the click; the server takes min(at, server time)',
});

export const StartTimerSchema = z.union([
  z.strictObject({
    projectId: z.number().int().positive(),
    taskId: TaskIdSchema.optional(),
    description: DescriptionSchema.optional(),
    at: AtSchema,
  }),
  z.strictObject({
    timeEntryId: z.number().int().positive().openapi({ description: 'Time entry of today' }),
    at: AtSchema,
  }),
]);

export type StartTimer = z.infer<typeof StartTimerSchema>;

export const StartTimerResultSchema = z.object({
  started: TimeEntrySchema,
  stopped: TimeEntrySchema.nullable(),
});

export type StartTimerResult = z.infer<typeof StartTimerResultSchema>;

export const StopTimerSchema = z.object({ at: AtSchema });

export type StopTimer = z.infer<typeof StopTimerSchema>;
