import type { ReactElement } from 'react';
import { formatPercent } from '@/format/decimal';
import { currencySymbol, formatMoney } from '@/format/money';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { Button } from '@/ui/Button';
import { PlusIcon, XIcon } from '@/ui/icons';
import type { ItemRows } from './useItemRows';

type ItemsEditorProps = {
  /** State of the rows from `useItemRows`. */
  rows: ItemRows;
  /** Note below the items, e.g. what removing an item does; none when omitted. */
  removeHint?: string;
};

/**
 * Editable items of an Invoice or Estimate: rows with description, quantity, unit price and
 * live amount, "Position hinzufügen" and the totals.
 * @example <ItemsEditor rows={rows} removeHint={t.removeHint} />
 */
export function ItemsEditor({ rows, removeHint }: ItemsEditorProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const t = messages.documents;
  const money = (minor: number): string => formatMoney(minor, currency, language);

  return (
    <section
      aria-labelledby="document-items"
      className="flex flex-col rounded-temp-card bg-temp-surface shadow-temp-card"
    >
      <h2 id="document-items" className="sr-only">
        {t.items}
      </h2>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[2.75rem_1fr_7rem_9rem_8rem] gap-4 border-temp-divider border-b px-4 py-3 text-temp-ink-muted md:grid"
      >
        <span />
        <span>{t.description}</span>
        <span className="text-right">{t.quantity}</span>
        <span className="text-right">{t.unitPrice}</span>
        <span className="text-right">{t.amount}</span>
      </div>
      <ol>
        {rows.items.map((item, index) => (
          <li
            key={item.key}
            className="grid grid-cols-[2.75rem_1fr] items-start gap-4 border-temp-divider border-b p-4 md:grid-cols-[2.75rem_1fr_7rem_9rem_8rem]"
          >
            <Button
              size="icon"
              aria-label={t.removeItem(index + 1)}
              onClick={() => rows.handleRemoveItem(item.key)}
            >
              <XIcon />
            </Button>
            <TextField
              name={`item-${item.key}-description`}
              label={t.descriptionFor(index + 1)}
              hideLabel
              multiline
              value={item.description}
              onValueChange={(v) => rows.handleItemChange(item.key, 'description', v)}
              inputClassName="field-sizing-content min-h-11"
            />
            <div className="col-start-2 grid grid-cols-3 items-start gap-4 md:col-span-3 md:col-start-3 md:grid-cols-[7rem_9rem_8rem]">
              <TextField
                name={`item-${item.key}-quantity`}
                label={t.quantityFor(index + 1)}
                hideLabel
                inputMode="decimal"
                autoComplete="off"
                value={item.quantity}
                onValueChange={(v) => rows.handleItemChange(item.key, 'quantity', v)}
                inputClassName="text-right"
              />
              <TextField
                name={`item-${item.key}-unitPrice`}
                label={t.unitPriceFor(index + 1)}
                hideLabel
                inputMode="decimal"
                autoComplete="off"
                prefix={<span aria-hidden="true">{currencySymbol(currency, language)}</span>}
                value={item.unitPrice}
                onValueChange={(v) => rows.handleItemChange(item.key, 'unitPrice', v)}
                inputClassName="text-right"
              />
              <span className="pt-2.5 text-right font-semibold whitespace-nowrap">
                {money(rows.amounts.get(item.key) ?? 0)}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-start justify-between gap-6 p-4">
        <div className="flex flex-col gap-2">
          <Button className="w-fit" onClick={rows.handleAddItem}>
            <PlusIcon />
            {t.addItem}
          </Button>
          {removeHint && <p className="text-sm text-temp-ink-muted">{removeHint}</p>}
        </div>
        <dl className="ml-auto grid grid-cols-[auto_auto] gap-x-8 gap-y-2 text-right">
          <dt>{t.subtotal}</dt>
          <dd>{money(rows.totals.subtotalMinor)}</dd>
          {rows.discountBasisPoints > 0 && (
            <>
              <dt>{t.discount(formatPercent(rows.discountBasisPoints, language))}</dt>
              <dd>−{money(rows.totals.discountMinor)}</dd>
            </>
          )}
          {rows.taxBasisPoints > 0 && (
            <>
              <dt>{t.tax(formatPercent(rows.taxBasisPoints, language))}</dt>
              <dd>{money(rows.totals.taxMinor)}</dd>
            </>
          )}
          <dt className="font-semibold">{t.total}</dt>
          <dd className="font-semibold">{money(rows.totals.totalMinor)}</dd>
        </dl>
      </div>
    </section>
  );
}
