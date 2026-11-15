import { type InvoiceTotals, invoiceTotals, itemAmountMinor } from '@dreck/shared/invoice';
import { useState } from 'react';
import { formatDecimalInput, parseDecimal } from '@/format/decimal';
import { formatAmountInput, parseAmount } from '@/format/money';
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

/** An item as the API returns it. */
type SavedItem = {
  id: number;
  description: string;
  quantityHundredths: number;
  unitPriceMinor: number;
};

/** An item as the API takes it in `items`. */
export type ItemPayload = {
  id: number | undefined;
  description: string;
  quantityHundredths: number;
  unitPriceMinor: number;
};

export type ItemRows = {
  items: ItemRow[];
  /** Amount per item key; 0 while an input is invalid. */
  amounts: Map<string, number>;
  totals: InvoiceTotals;
  /** Tax and discount as the form parsed them, for the labels of the totals. */
  taxBasisPoints: number;
  discountBasisPoints: number;
  /** Errors per field name (`item-<key>-description`), empty when all rows are valid. */
  validate: () => Record<string, string>;
  /** The rows as the `items` of a PATCH. */
  toPayload: () => ItemPayload[];
  handleItemChange: (
    key: string,
    field: 'description' | 'quantity' | 'unitPrice',
    value: string,
  ) => void;
  handleAddItem: () => void;
  handleRemoveItem: (key: string) => void;
};

/**
 * Rows of an items editor with live amounts and totals for an Invoice or Estimate. Tax and
 * discount come from the form around it.
 */
export function useItemRows(
  saved: SavedItem[],
  discountBasisPoints: number,
  taxBasisPoints: number,
): ItemRows {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const t = messages.documents.errors;

  const [items, setItems] = useState<ItemRow[]>(() =>
    saved.map((item) => ({
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

  return {
    items,
    amounts: new Map(
      parsed.map((p) => [p.key, itemAmountMinor(p.quantityHundredths, p.unitPriceMinor)]),
    ),
    totals: invoiceTotals(parsed, discountBasisPoints, taxBasisPoints),
    taxBasisPoints,
    discountBasisPoints,
    validate: () => {
      const errors: Record<string, string> = {};
      for (const item of items) {
        if (item.description.trim() === '') errors[`item-${item.key}-description`] = t.description;
        if (parseDecimal(item.quantity, 2) === null) {
          errors[`item-${item.key}-quantity`] = t.quantity;
        }
        if (parseAmount(item.unitPrice, currency) === null) {
          errors[`item-${item.key}-unitPrice`] = messages.expenses.errors.amount;
        }
      }
      return errors;
    },
    toPayload: () =>
      items.map((item, i) => ({
        id: item.id,
        description: item.description.trim(),
        quantityHundredths: parsed[i]?.quantityHundredths ?? 0,
        unitPriceMinor: parsed[i]?.unitPriceMinor ?? 0,
      })),
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
