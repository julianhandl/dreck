import type { Invoice, UpdateInvoice } from '@dreck/shared/api/invoices';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import { type ItemRows, useItemRows } from '@/features/documents/useItemRows';
import { addDays } from '@/format/calendar';
import { formatPercentInput, parsePercent } from '@/format/decimal';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';

type Field =
  | 'number'
  | 'recipient'
  | 'issueDate'
  | 'dueDate'
  | 'periodFrom'
  | 'periodTo'
  | 'subject'
  | 'tax'
  | 'discount'
  | 'notes';

export type InvoiceForm = {
  values: Record<Field, string>;
  /** Rows, amounts and totals of the items. */
  rows: ItemRows;
  submit: Submit<null>;
  handleChange: (field: Field) => (value: string) => void;
  /** Sets the due date `days` after the issue date. */
  handleDueIn: (days: number) => void;
};

/** Form state of "Invoice bearbeiten" with live totals; saving goes back to the Invoice. */
export function useInvoiceForm(invoice: Invoice): InvoiceForm {
  const { language, messages } = useI18n();
  const navigate = useNavigate();
  const t = messages.invoices.form.errors;

  const [values, setValues] = useState<Record<Field, string>>(() => ({
    number: invoice.number,
    recipient: invoice.recipient,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    periodFrom: invoice.periodFrom ?? '',
    periodTo: invoice.periodTo ?? '',
    subject: invoice.subject ?? '',
    tax: formatPercentInput(invoice.taxBasisPoints, language),
    discount: formatPercentInput(invoice.discountBasisPoints, language),
    notes: invoice.notes ?? '',
  }));
  const taxBasisPoints = parsePercent(values.tax) ?? 0;
  const discountBasisPoints = parsePercent(values.discount) ?? 0;
  const rows = useItemRows(invoice.items, discountBasisPoints, taxBasisPoints);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const field of ['number', 'recipient', 'issueDate', 'dueDate'] as const) {
      if (values[field].trim() === '') errors[field] = t.required;
    }
    if (values.dueDate && values.dueDate < values.issueDate) errors.dueDate = t.dueBeforeIssue;
    if (values.periodFrom && values.periodTo && values.periodTo < values.periodFrom) {
      errors.periodTo = t.periodOrder;
    }
    if (parsePercent(values.tax) === null) errors.tax = messages.settings.percentError;
    if (parsePercent(values.discount) === null) errors.discount = messages.settings.percentError;
    return { ...errors, ...rows.validate() };
  }

  const submit = useSubmit(
    async () => {
      const body: UpdateInvoice = {
        number: values.number.trim(),
        recipient: values.recipient.trim(),
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        periodFrom: values.periodFrom || null,
        periodTo: values.periodTo || null,
        subject: values.subject.trim() || null,
        notes: values.notes.trim() || null,
        taxBasisPoints,
        discountBasisPoints,
        items: rows.toPayload(),
      };
      await api.patch(`/invoices/${invoice.id}`, body);
      navigate(`/invoices/${invoice.id}`);
    },
    {
      validate,
      fields: {
        number_taken: 'number',
      },
    },
  );

  return {
    values,
    rows,
    submit,
    handleChange: (field) => (value) => setValues((v) => ({ ...v, [field]: value })),
    handleDueIn: (days) =>
      setValues((v) => (v.issueDate ? { ...v, dueDate: addDays(v.issueDate, days) } : v)),
  };
}
