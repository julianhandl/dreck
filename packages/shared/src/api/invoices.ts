import { INVOICE_STATUSES } from '@dreck/shared/invoice';
import { INVOICE_GROUPINGS } from '@dreck/shared/invoice-items';
import { z } from '@hono/zod-openapi';
import { DateSchema, nonEmpty, RateSchema } from './common';

/** Percentage in basis points: 2000 = 20 %. */
export const BasisPointsSchema = z.number().int().min(0).max(10000).openapi({ example: 2000 });

const NumberSchema = z.string().trim().min(1).max(50).openapi({ example: 'RE-2026-001' });
const TextSchema = z.string().trim().max(5000);

const ItemFieldsSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  quantityHundredths: z
    .number()
    .int()
    .min(0)
    .max(100_000_000)
    .openapi({ description: 'Quantity × 100, e.g. 1917 = 19.17 hours', example: 1917 }),
  unitPriceMinor: RateSchema,
});

export const InvoiceItemSchema = ItemFieldsSchema.extend({
  id: z.number().int(),
  amountMinor: z.number().int().openapi({ description: 'round(quantity × unit price)' }),
}).openapi('InvoiceItem');

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const InvoiceSchema = z
  .object({
    id: z.number().int(),
    number: z.string(),
    customerId: z.number().int(),
    recipient: z.string().openapi({ description: 'Name and address as printed on the invoice' }),
    issueDate: DateSchema,
    dueDate: DateSchema,
    periodFrom: DateSchema.nullable().openapi({ description: 'Start of the service period' }),
    periodTo: DateSchema.nullable(),
    subject: z.string().nullable(),
    notes: z.string().nullable().openapi({ description: 'Text below the items' }),
    taxBasisPoints: BasisPointsSchema,
    discountBasisPoints: BasisPointsSchema,
    sentOn: DateSchema.nullable(),
    paidOn: DateSchema.nullable(),
    status: z.enum(INVOICE_STATUSES).openapi({ description: 'From paidOn and sentOn' }),
    items: z.array(InvoiceItemSchema),
    subtotalMinor: z.number().int(),
    discountMinor: z.number().int(),
    taxMinor: z.number().int(),
    totalMinor: z.number().int(),
  })
  .openapi('Invoice');

export type Invoice = z.infer<typeof InvoiceSchema>;

export const InvoiceImportSchema = z
  .object({
    from: DateSchema,
    to: DateSchema,
    projectId: z
      .number()
      .int()
      .positive()
      .optional()
      .openapi({ description: 'Only this Project of the Customer' }),
    grouping: z.enum(INVOICE_GROUPINGS).openapi({
      description:
        'One item per Project and Hourly Rate, additionally per description, or one per Time Entry',
    }),
    expenses: z.boolean().openapi({ description: 'Also one item per Billable Expense' }),
  })
  .refine((i) => i.from <= i.to, { message: 'from is after to', path: ['to'] })
  .openapi({
    description:
      'Turns the uninvoiced, stopped Time Entries (and Billable Expenses) of the Customer in the range into items. They stay locked while their item exists.',
  });

export type InvoiceImport = z.infer<typeof InvoiceImportSchema>;

export const CreateInvoiceSchema = z.object({
  customerId: z.number().int().positive(),
  number: NumberSchema.optional().openapi({ description: 'Defaults to the next number' }),
  recipient: TextSchema.min(1)
    .optional()
    .openapi({ description: 'Defaults to name and address of the Customer' }),
  issueDate: DateSchema,
  dueDate: DateSchema,
  periodFrom: DateSchema.optional().openapi({ description: 'Defaults to import.from' }),
  periodTo: DateSchema.optional().openapi({ description: 'Defaults to import.to' }),
  subject: TextSchema.optional(),
  notes: TextSchema.optional().openapi({ description: 'Defaults to the default invoice notes' }),
  taxBasisPoints: BasisPointsSchema.optional().openapi({
    description: 'Defaults to the default tax',
  }),
  discountBasisPoints: BasisPointsSchema.optional(),
  items: z.array(ItemFieldsSchema).max(1000).optional(),
  import: InvoiceImportSchema.optional(),
});

export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;

export const UpdateInvoiceItemSchema = ItemFieldsSchema.extend({
  id: z
    .number()
    .int()
    .positive()
    .optional()
    .openapi({ description: 'Existing item to keep; without a new one' }),
});

export type UpdateInvoiceItem = z.infer<typeof UpdateInvoiceItemSchema>;

export const UpdateInvoiceSchema = z
  .object({
    number: NumberSchema,
    recipient: TextSchema.min(1),
    issueDate: DateSchema,
    dueDate: DateSchema,
    periodFrom: DateSchema.nullable(),
    periodTo: DateSchema.nullable(),
    subject: TextSchema.nullable(),
    notes: TextSchema.nullable(),
    taxBasisPoints: BasisPointsSchema,
    discountBasisPoints: BasisPointsSchema,
    items: z.array(UpdateInvoiceItemSchema).max(1000).openapi({
      description:
        'The complete list. Existing items missing here are removed and release their Time Entries and Expenses.',
    }),
    sentOn: DateSchema.nullable().openapi({ description: 'Set = sent; locks the content' }),
    paidOn: DateSchema.nullable().openapi({ description: 'Set = paid; locks the content' }),
  })
  .partial()
  .refine(nonEmpty, 'Nothing to change');

export type UpdateInvoice = z.infer<typeof UpdateInvoiceSchema>;
