import type { Estimate, UpdateEstimate } from '@dreck/shared/api/estimates';
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
  | 'validUntil'
  | 'subject'
  | 'tax'
  | 'discount'
  | 'notes';

export type EstimateForm = {
  values: Record<Field, string>;
  /** Rows, amounts and totals of the items. */
  rows: ItemRows;
  submit: Submit<null>;
  handleChange: (field: Field) => (value: string) => void;
  /** Sets "Gültig bis" `days` after the estimate date. */
  handleValidIn: (days: number) => void;
};

/** Form state of "Angebot bearbeiten" with live totals; saving goes back to the Estimate. */
export function useEstimateForm(estimate: Estimate): EstimateForm {
  const { language, messages } = useI18n();
  const navigate = useNavigate();
  const t = messages.estimates.form.errors;

  const [values, setValues] = useState<Record<Field, string>>(() => ({
    number: estimate.number,
    recipient: estimate.recipient,
    issueDate: estimate.issueDate,
    validUntil: estimate.validUntil ?? '',
    subject: estimate.subject ?? '',
    tax: formatPercentInput(estimate.taxBasisPoints, language),
    discount: formatPercentInput(estimate.discountBasisPoints, language),
    notes: estimate.notes ?? '',
  }));
  const taxBasisPoints = parsePercent(values.tax) ?? 0;
  const discountBasisPoints = parsePercent(values.discount) ?? 0;
  const rows = useItemRows(estimate.items, discountBasisPoints, taxBasisPoints);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const field of ['number', 'recipient', 'issueDate'] as const) {
      if (values[field].trim() === '') errors[field] = t.required;
    }
    if (values.validUntil && values.validUntil < values.issueDate) {
      errors.validUntil = t.validBeforeIssue;
    }
    if (parsePercent(values.tax) === null) errors.tax = messages.settings.percentError;
    if (parsePercent(values.discount) === null) errors.discount = messages.settings.percentError;
    return { ...errors, ...rows.validate() };
  }

  const submit = useSubmit(
    async () => {
      const body: UpdateEstimate = {
        number: values.number.trim(),
        recipient: values.recipient.trim(),
        issueDate: values.issueDate,
        validUntil: values.validUntil || null,
        subject: values.subject.trim() || null,
        notes: values.notes.trim() || null,
        taxBasisPoints,
        discountBasisPoints,
        items: rows.toPayload(),
      };
      await api.patch(`/estimates/${estimate.id}`, body);
      navigate(`/estimates/${estimate.id}`);
    },
    { validate, fields: { number_taken: 'number' } },
  );

  return {
    values,
    rows,
    submit,
    handleChange: (field) => (value) => setValues((v) => ({ ...v, [field]: value })),
    handleValidIn: (days) =>
      setValues((v) => (v.issueDate ? { ...v, validUntil: addDays(v.issueDate, days) } : v)),
  };
}
