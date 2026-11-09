import { z } from '@hono/zod-openapi';
import { NameSchema, nonEmpty, RateSchema } from './common';
import { ApplyRateSchema } from './projects';

export const CustomerSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    hourlyRateMinor: RateSchema,
    archived: z.boolean(),
  })
  .openapi('Customer');

export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerSchema = z.object({
  name: NameSchema,
  hourlyRateMinor: RateSchema.optional().openapi({
    description: 'Defaults to the Default Hourly Rate',
  }),
});

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z
  .object({
    name: NameSchema,
    hourlyRateMinor: RateSchema,
    archived: z.boolean(),
    applyToProjects: z
      .object({
        projectIds: z.array(z.number().int().positive()),
        applyToTimeEntries: ApplyRateSchema.optional().openapi({
          description: 'Existing Time Entries of these projects that take over the rate too',
        }),
      })
      .openapi({
        description:
          'Projects of this customer that take over the new Hourly Rate; their Time Entries only with applyToTimeEntries',
      }),
  })
  .partial()
  .refine(nonEmpty, 'Nothing to change')
  .refine((b) => b.applyToProjects === undefined || b.hourlyRateMinor !== undefined, {
    message: 'applyToProjects requires hourlyRateMinor',
    path: ['applyToProjects'],
  });

export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
