import { ESTIMATE_STATUSES } from '@dreck/shared/estimate';
import { z } from '@hono/zod-openapi';
import { DateSchema, nonEmpty } from './common';
import { BasisPointsSchema, ItemFieldsSchema, NumberSchema, TextSchema } from './invoices';

export const EstimateItemSchema = ItemFieldsSchema.extend({
  id: z.number().int(),
  amountMinor: z.number().int().openapi({ description: 'round(quantity × unit price)' }),
}).openapi('EstimateItem');

export type EstimateItem = z.infer<typeof EstimateItemSchema>;

export const EstimateSchema = z
  .object({
    id: z.number().int(),
    number: z.string(),
    customerId: z.number().int(),
    recipient: z.string().openapi({ description: 'Name and address as printed on the estimate' }),
    issueDate: DateSchema,
    validUntil: DateSchema.nullable(),
    subject: z.string().nullable(),
    notes: z.string().nullable().openapi({ description: 'Text below the items' }),
    taxBasisPoints: BasisPointsSchema,
    discountBasisPoints: BasisPointsSchema,
    sentOn: DateSchema.nullable(),
    acceptedOn: DateSchema.nullable(),
    declinedOn: DateSchema.nullable(),
    status: z
      .enum(ESTIMATE_STATUSES)
      .openapi({ description: 'From acceptedOn, declinedOn and sentOn' }),
    items: z.array(EstimateItemSchema),
    subtotalMinor: z.number().int(),
    discountMinor: z.number().int(),
    taxMinor: z.number().int(),
    totalMinor: z.number().int(),
  })
  .openapi('Estimate');

export type Estimate = z.infer<typeof EstimateSchema>;

export const CreateEstimateSchema = z.object({
  customerId: z.number().int().positive(),
  number: NumberSchema.optional().openapi({ description: 'Defaults to the next number' }),
  recipient: TextSchema.min(1)
    .optional()
    .openapi({ description: 'Defaults to name and address of the Customer' }),
  issueDate: DateSchema,
  validUntil: DateSchema.optional(),
  subject: TextSchema.optional(),
  notes: TextSchema.optional().openapi({ description: 'Defaults to the default estimate notes' }),
  taxBasisPoints: BasisPointsSchema.optional().openapi({
    description: 'Defaults to the default tax',
  }),
  discountBasisPoints: BasisPointsSchema.optional(),
  items: z.array(ItemFieldsSchema).max(1000).optional(),
});

export type CreateEstimate = z.infer<typeof CreateEstimateSchema>;

export const UpdateEstimateItemSchema = ItemFieldsSchema.extend({
  id: z
    .number()
    .int()
    .positive()
    .optional()
    .openapi({ description: 'Existing item to keep; without a new one' }),
});

export type UpdateEstimateItem = z.infer<typeof UpdateEstimateItemSchema>;

export const UpdateEstimateSchema = z
  .object({
    number: NumberSchema,
    recipient: TextSchema.min(1),
    issueDate: DateSchema,
    validUntil: DateSchema.nullable(),
    subject: TextSchema.nullable(),
    notes: TextSchema.nullable(),
    taxBasisPoints: BasisPointsSchema,
    discountBasisPoints: BasisPointsSchema,
    items: UpdateEstimateItemSchema.array().max(1000).openapi({
      description: 'The complete list. Existing items missing here are removed.',
    }),
    sentOn: DateSchema.nullable().openapi({ description: 'Set = sent; locks the content' }),
    acceptedOn: DateSchema.nullable().openapi({ description: 'Set = accepted; locks the content' }),
    declinedOn: DateSchema.nullable().openapi({ description: 'Set = declined; locks the content' }),
  })
  .partial()
  .refine(nonEmpty, 'Nothing to change');

export type UpdateEstimate = z.infer<typeof UpdateEstimateSchema>;
