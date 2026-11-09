import { z } from '@hono/zod-openapi';
import { DateSchema, nonEmpty } from './common';

export const CreateExpenseSchema = z.object({
  projectId: z.number().int().positive(),
  date: DateSchema,
  amountMinor: z.number().int().positive().openapi({ example: 1250 }),
  description: z.string().trim().min(1).max(2000),
  billable: z.boolean().openapi({ description: 'Charged on to the customer' }),
});

export type CreateExpense = z.infer<typeof CreateExpenseSchema>;

export const ExpenseSchema = CreateExpenseSchema.extend({ id: z.number().int() }).openapi(
  'Expense',
);

export type Expense = z.infer<typeof ExpenseSchema>;

export const UpdateExpenseSchema = CreateExpenseSchema.partial().refine(
  nonEmpty,
  'Nothing to change',
);

export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>;
