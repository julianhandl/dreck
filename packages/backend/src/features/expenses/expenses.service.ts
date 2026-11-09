import { desc, eq } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { type EntryFilter, entryFilter } from '@/features/entry-filter';
import { requireProject } from '@/features/projects/projects.service';
import { ApiError } from '@/http/api-error';
import { type Expense, expenses } from './expenses.table';

type ExpenseInput = Omit<Expense, 'id'>;

/** Expenses by `date` descending, newest first within a day. */
export function listExpenses(db: Db, filter: EntryFilter): Expense[] {
  return db
    .select()
    .from(expenses)
    .where(entryFilter(db, expenses, filter))
    .orderBy(desc(expenses.date), desc(expenses.id))
    .all();
}

export function createExpense(db: Db, input: ExpenseInput): Expense {
  requireProject(db, input.projectId);
  return db.insert(expenses).values(input).returning().get();
}

export function updateExpense(db: Db, id: number, changes: Partial<ExpenseInput>): Expense {
  if (changes.projectId !== undefined) requireProject(db, changes.projectId);
  const updated = db.update(expenses).set(changes).where(eq(expenses.id, id)).returning().get();
  if (!updated) throw new ApiError('not_found', 'Expense not found');
  return updated;
}

export function deleteExpense(db: Db, id: number): void {
  const deleted = db.delete(expenses).where(eq(expenses.id, id)).returning().get();
  if (!deleted) throw new ApiError('not_found', 'Expense not found');
}
