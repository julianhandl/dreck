import { Form } from '@base-ui/react/form';
import type { Expense } from '@dreck/shared/api/expenses';
import type { ReactElement } from 'react';
import { ProjectPicker } from '@/catalog/ProjectPicker';
import type { Catalog } from '@/catalog/useCatalog';
import { currencySymbol } from '@/format/money';
import { CheckboxField } from '@/forms/CheckboxField';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { useExpenseForm } from './useExpenseForm';

type ExpenseFormProps = {
  catalog: Catalog;
  /** All Expenses, newest first. */
  expenses: Expense[];
  /** The Expense to edit; a new one without. */
  expense?: Expense;
  today: string;
  /** Closes the form (Abbrechen, after saving). */
  onClose: () => void;
};

/**
 * Highlighted form panel for an Expense: date, Project, notes, Billable and the amount.
 * @example <ExpenseForm catalog={catalog} expenses={expenses} today={today} onClose={close} />
 */
export function ExpenseForm(props: ExpenseFormProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const form = useExpenseForm(props);
  const { submit } = form;
  const t = messages.expenses.form;

  return (
    <Form
      ref={submit.formRef}
      errors={submit.errors}
      onFormSubmit={() => submit.handleSubmit('save')}
      className="grid gap-4 border border-temp-highlight-border bg-temp-highlight p-4 sm:p-6 md:grid-cols-[11rem_1fr_14rem]"
    >
      <TextField
        name="date"
        label={t.date}
        type="date"
        required
        value={form.date}
        onValueChange={form.handleDateChange}
      />
      <div className="flex flex-col gap-3">
        <ProjectPicker
          name="projectId"
          label={t.project}
          catalog={props.catalog}
          value={form.projectId}
          onValueChange={form.handleProjectChange}
        />
        <TextField
          name="description"
          label={t.description}
          multiline
          required
          value={form.description}
          onValueChange={form.handleDescriptionChange}
        />
      </div>
      <div>
        <TextField
          name="amount"
          label={t.amount}
          required
          inputMode="decimal"
          autoComplete="off"
          prefix={
            <span className="font-semibold text-xl">{currencySymbol(currency, language)}</span>
          }
          value={form.amount}
          onValueChange={form.handleAmountChange}
          inputClassName="min-h-16 text-xl"
        />
      </div>
      <div className="flex flex-col gap-3 md:col-start-2">
        <CheckboxField
          label={t.billable}
          checked={form.billable}
          onCheckedChange={form.handleBillableChange}
        />
        <FormStatus submit={submit} />
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" type="submit" aria-disabled={submit.pending}>
            {props.expense ? t.update : t.save}
          </Button>
          <Button onClick={props.onClose}>{messages.common.cancel}</Button>
          {props.expense && (
            <Button
              variant="danger"
              className="ml-auto"
              aria-disabled={submit.pending}
              onClick={() => submit.handleSubmit('delete')}
            >
              {messages.common.delete}
            </Button>
          )}
        </div>
      </div>
    </Form>
  );
}
