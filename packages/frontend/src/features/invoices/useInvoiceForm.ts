import type { Invoice, UpdateInvoice } from '@dreck/shared/api/invoices';
import { type InvoiceTotals, invoiceTotals, itemAmountMinor } from '@dreck/shared/invoice';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import { addDays } from '@/format/calendar';
import {
  formatDecimalInput,
  formatPercentInput,
  parseDecimal,
  parsePercent,
} from '@/format/decimal';
import { formatAmountInput, parseAmount } from '@/format/money';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';

/** One editable item; `id` is set for items that already exist. */
export type ItemRow = {
  key: string;
  id?: number;
  description: string;
  quantity: string;
  unitPrice: string;
};

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
  items: ItemRow[];
  /** Amount per item key; 0 while an input is invalid. */
  amounts: Map<string, number>;
  totals: InvoiceTotals;
  /** Tax and discount as parsed, for the labels of the totals. */
  taxBasisPoints: number;
  discountBasisPoints: number;
  submit: Submit<null>;
  handleChange: (field: Field) => (value: string) => void;
  /** Sets the due date `days` after the issue date. */
  handleDueIn: (days: number) => void;
  handleItemChange: (
    key: string,
    field: 'description' | 'quantity' | 'unitPrice',
    value: string,
  ) => void;
  handleAddItem: () => void;
  handleRemoveItem: (key: string) => void;
};

/** Form state of "Invoice bearbeiten" with live totals; saving goes back to the Invoice. */
export function useInvoiceForm(invoice: Invoice): InvoiceForm {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
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
  const [items, setItems] = useState<ItemRow[]>(() =>
    invoice.items.map((item) => ({
      key: String(item.id),
      id: item.id,
      description: item.description,
      quantity: formatDecimalInput(item.quantityHundredths, 2, language),
      unitPrice: formatAmountInput(item.unitPriceMinor, currency, language),
    })),
  );
  const [nextKey, setNextKey] = useState(0);

  const parsed = items.map((item) => ({
    key: item.key,
    quantityHundredths: parseDecimal(item.quantity, 2) ?? 0,
    unitPriceMinor: parseAmount(item.unitPrice, currency) ?? 0,
  }));
  const taxBasisPoints = parsePercent(values.tax) ?? 0;
  const discountBasisPoints = parsePercent(values.discount) ?? 0;

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
    for (const item of items) {
      if (item.description.trim() === '') errors[`item-${item.key}-description`] = t.description;
      if (parseDecimal(item.quantity, 2) === null) errors[`item-${item.key}-quantity`] = t.quantity;
      if (parseAmount(item.unitPrice, currency) === null) {
        errors[`item-${item.key}-unitPrice`] = messages.expenses.errors.amount;
      }
    }
    return errors;
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
        items: items.map((item, i) => ({
          id: item.id,
          description: item.description.trim(),
          quantityHundredths: parsed[i]?.quantityHundredths ?? 0,
          unitPriceMinor: parsed[i]?.unitPriceMinor ?? 0,
        })),
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
    items,
    amounts: new Map(
      parsed.map((p) => [p.key, itemAmountMinor(p.quantityHundredths, p.unitPriceMinor)]),
    ),
    totals: invoiceTotals(parsed, discountBasisPoints, taxBasisPoints),
    taxBasisPoints,
    discountBasisPoints,
    submit,
    handleChange: (field) => (value) => setValues((v) => ({ ...v, [field]: value })),
    handleDueIn: (days) =>
      setValues((v) => (v.issueDate ? { ...v, dueDate: addDays(v.issueDate, days) } : v)),
    handleItemChange: (key, field, value) =>
      setItems((list) =>
        list.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
      ),
    handleAddItem: () => {
      setItems((list) => [
        ...list,
        { key: `new-${nextKey}`, description: '', quantity: '1', unitPrice: '' },
      ]);
      setNextKey((n) => n + 1);
    },
    handleRemoveItem: (key) => setItems((list) => list.filter((item) => item.key !== key)),
  };
}
