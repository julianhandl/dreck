import { z } from '@hono/zod-openapi';
import { NameSchema, RateSchema } from './common';

export const TaskSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    billable: z.boolean(),
    hourlyRateMinor: RateSchema.nullable().openapi({
      description: 'Own Hourly Rate; null = the rate of the Project',
    }),
    archived: z.boolean(),
  })
  .openapi('Task');

export type Task = z.infer<typeof TaskSchema>;

export const DefaultTaskSchema = z
  .object({ name: NameSchema, billable: z.boolean() })
  .openapi('DefaultTask');

export type DefaultTask = z.infer<typeof DefaultTaskSchema>;

/** A Task in the list of a Project: with `id` it changes, without it is new. */
export const TaskInputSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: NameSchema,
    billable: z.boolean(),
    hourlyRateMinor: RateSchema.nullable().optional().openapi({
      description: 'Own Hourly Rate, only for billable Tasks; null or missing = the Project rate',
    }),
    archived: z.boolean().optional(),
  })
  .refine((t) => t.billable || t.hourlyRateMinor == null, {
    message: 'Only billable tasks have an hourly rate',
    path: ['hourlyRateMinor'],
  });

export type TaskInput = z.infer<typeof TaskInputSchema>;

/** Rejects a list with the same name twice, ignoring case. */
export function uniqueNames(list: { name: string }[]): boolean {
  return new Set(list.map((t) => t.name.toLowerCase())).size === list.length;
}

export const TaskListSchema = z
  .array(TaskInputSchema)
  .refine(uniqueNames, 'Task names must be unique');

export const DefaultTaskListSchema = z
  .array(DefaultTaskSchema)
  .refine(uniqueNames, 'Task names must be unique');

/**
 * Hourly Rate a new Time Entry takes over: the Task's own rate, otherwise the Project's.
 * @example taskRateMinor({ hourlyRateMinor: null }, { hourlyRateMinor: 9000 }) // 9000
 */
export function taskRateMinor(
  task: { hourlyRateMinor: number | null } | undefined,
  project: { hourlyRateMinor: number },
): number {
  return task?.hourlyRateMinor ?? project.hourlyRateMinor;
}
