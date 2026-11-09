import type { Expense } from '@dreck/shared/api/expenses';
import { useEffect, useState } from 'react';
import { api } from '@/api/api-client';
import type { Catalog } from '@/catalog/useCatalog';
import { formatAmountInput, parseAmount } from '@/format/money';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';

type Command = 'save' | 'delete';

type ExpenseFormOptions = {
  catalog: Catalog;
  /** All Expenses, newest first: prefill of Project and Billable. */
  expenses: Expense[];
  /** The Expense to edit; a new one without. */
  expense?: Expense;
  today: string;
  /** Closes the form after saving or deleting. */
  onClose: () => void;
};

export type ExpenseForm = {
  date: string;
  projectId: number | null;
  description: string;
  amount: string;
  billable: boolean;
  submit: Submit<Command>;
  handleDateChange: (value: string) => void;
  handleProjectChange: (projectId: number) => void;
  handleDescriptionChange: (value: string) => void;
  handleAmountChange: (value: string) => void;
  handleBillableChange: (value: boolean) => void;
};

/** Form state for a new or edited Expense. */
export function useExpenseForm(options: ExpenseFormOptions): ExpenseForm {
  const { catalog, expenses, expense, today, onClose } = options;
  const { messages, language } = useI18n();
  const { currency } = useSettings();
  const selectable = new Set(catalog.selectable.flatMap((g) => g.projects.map((p) => p.id)));
  const lastProjectId = expenses.find((e) => selectable.has(e.projectId))?.projectId ?? null;

  const [date, setDate] = useState(expense?.date ?? today);
  const [projectId, setProjectId] = useState(expense?.projectId ?? lastProjectId);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(() =>
    expense ? formatAmountInput(expense.amountMinor, currency, language) : '',
  );
  const [billable, setBillable] = useState(expense?.billable ?? lastBillable(lastProjectId));

  // Billable as last time on this Project
  function lastBillable(id: number | null): boolean {
    return expenses.find((e) => e.projectId === id)?.billable ?? true;
  }

  function validate(command: Command): Record<string, string> {
    if (command === 'delete') return {};
    const errors: Record<string, string> = {};
    if (projectId === null) errors.projectId = messages.time.errors.projectRequired;
    if (description.trim() === '')
      errors.description = messages.expenses.errors.descriptionRequired;
    const minor = parseAmount(amount, currency);
    if (minor === null || minor <= 0) errors.amount = messages.expenses.errors.amount;
    return errors;
  }

  const submit = useSubmit(
    async (command: Command) => {
      if (command === 'delete' && expense) {
        await api.delete(`/expenses/${expense.id}`);
      } else {
        const body = {
          date,
          projectId,
          description: description.trim(),
          amountMinor: parseAmount(amount, currency),
          billable,
        };
        if (expense) await api.patch(`/expenses/${expense.id}`, body);
        else await api.post('/expenses', body);
      }
      onClose();
    },
    { validate, fields: { not_found: 'projectId' } },
  );

  // The form replaces the clicked button; without this the focus falls back to <body>
  const { formRef } = submit;
  useEffect(() => {
    formRef.current?.querySelector('input')?.focus();
  }, [formRef]);

  return {
    date,
    projectId,
    description,
    amount,
    billable,
    submit,
    handleDateChange: setDate,
    handleProjectChange: (id) => {
      setProjectId(id);
      if (!expense) setBillable(lastBillable(id));
    },
    handleDescriptionChange: setDescription,
    handleAmountChange: setAmount,
    handleBillableChange: setBillable,
  };
}
