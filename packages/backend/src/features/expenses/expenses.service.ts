import { desc, eq } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { type EntryFilter, entryFilter } from '@/features/entry-filter';
import { requireProject } from '@/features/projects/projects.service';
import { requireNotInvoiced } from '@/features/time-entries/time-entries.service';
import { ApiError } from '@/http/api-error';
import { type Expense, expenses } from './expenses.table';

type ExpenseInput = Omit<Expense, 'id' | 'invoiceItemId'>;

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

/** Changes an Expense; `409 invoiced` while it is part of an Invoice. */
export function updateExpense(db: Db, id: number, changes: Partial<ExpenseInput>): Expense {
  return db.transaction((tx) => {
    requireNotInvoiced(requireExpense(tx, id));
    if (changes.projectId !== undefined) requireProject(tx, changes.projectId);
    const updated = tx.update(expenses).set(changes).where(eq(expenses.id, id)).returning().get();
    if (!updated) throw new ApiError('not_found', 'Expense not found');
    return updated;
  });
}

/** Deletes an Expense; `409 invoiced` while it is part of an Invoice. */
export function deleteExpense(db: Db, id: number): void {
  db.transaction((tx) => {
    requireNotInvoiced(requireExpense(tx, id));
    tx.delete(expenses).where(eq(expenses.id, id)).run();
  });
}

function requireExpense(db: Db, id: number): Expense {
  const expense = db.select().from(expenses).where(eq(expenses.id, id)).get();
  if (!expense) throw new ApiError('not_found', 'Expense not found');
  return expense;
}
