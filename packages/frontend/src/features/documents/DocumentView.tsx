import type { ReactElement } from 'react';
import { formatPercent } from '@/format/decimal';
import { formatMoney } from '@/format/money';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { formatQuantity } from './document-display';

const NUM = 'py-2 pl-4 text-right align-top whitespace-nowrap';

type DocumentViewProps = {
  /** Heading, e.g. "Rechnung" or "Angebot". */
  title: string;
  /** Label of the number, e.g. "Rechnungsnummer". */
  numberLabel: string;
  /** Number of the document, first row next to the recipient. */
  number: string;
  /** Name and address of the recipient. */
  recipient: string;
  /** Rows under the number, in this order. */
  dates: { label: string; value: string }[];
  /** Bold line above the items. */
  subject: string | null;
  /** The positions with their amounts. */
  items: {
    id: number;
    description: string;
    quantityHundredths: number;
    unitPriceMinor: number;
    amountMinor: number;
  }[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  discountBasisPoints: number;
  taxBasisPoints: number;
  /** Text below the totals. */
  notes: string | null;
};

/**
 * The document as the Customer gets it: sender from the settings, recipient, number, dates,
 * items, totals and notes. It is the only part of a page that prints.
 * @example <DocumentView title="Angebot" numberLabel="Angebotsnummer" number="AN-1" recipient="Acme" dates={[]} … />
 */
export function DocumentView({
  title,
  numberLabel,
  number,
  recipient,
  dates,
  subject,
  items,
  subtotalMinor,
  discountMinor,
  taxMinor,
  totalMinor,
  discountBasisPoints,
  taxBasisPoints,
  notes,
}: DocumentViewProps): ReactElement {
  const { language, messages } = useI18n();
  const settings = useSettings();
  const t = messages.documents;
  const money = (minor: number): string => formatMoney(minor, settings.currency, language);

  return (
    <article className="flex flex-col gap-10 rounded-temp-card bg-temp-surface p-6 shadow-temp-card sm:p-12 print:rounded-none print:p-temp-print-page print:pl-temp-print-binding print:shadow-none print:box-decoration-clone">
      <header className="flex flex-wrap justify-between gap-6">
        <h2 className="font-semibold text-temp-page-title uppercase tracking-tight">{title}</h2>
        <address className="not-italic sm:text-right">
          {settings.senderName && <p className="font-semibold">{settings.senderName}</p>}
          {settings.senderAddress && (
            <p className="whitespace-pre-line">{settings.senderAddress}</p>
          )}
          {settings.senderVatId && <p>{t.vatId(settings.senderVatId)}</p>}
        </address>
      </header>

      <div className="flex flex-wrap justify-between gap-6">
        <address className="whitespace-pre-line not-italic first-line:font-semibold">
          {recipient}
        </address>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
          <dt className="text-temp-ink-muted">{numberLabel}</dt>
          <dd className="font-semibold">{number}</dd>
          {dates.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
      </div>

      {subject && <p className="font-semibold text-xl">{subject}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-xl border-collapse">
          <thead className="border-temp-ink border-b text-left">
            <tr>
              <th scope="col" className="py-2 font-semibold">
                {t.description}
              </th>
              <th scope="col" className={`${NUM} font-semibold`}>
                {t.quantity}
              </th>
              <th scope="col" className={`${NUM} font-semibold`}>
                {t.unitPrice}
              </th>
              <th scope="col" className={`${NUM} font-semibold`}>
                {t.amount}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="break-inside-avoid border-temp-divider border-b">
                <td className="py-2 align-top whitespace-pre-line">{item.description}</td>
                <td className={NUM}>{formatQuantity(item.quantityHundredths, language)}</td>
                <td className={NUM}>{money(item.unitPriceMinor)}</td>
                <td className={NUM}>{money(item.amountMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto grid grid-cols-[auto_auto] gap-x-10 gap-y-1 text-right break-inside-avoid">
        <dt>{t.subtotal}</dt>
        <dd>{money(subtotalMinor)}</dd>
        {discountBasisPoints > 0 && (
          <>
            <dt>{t.discount(formatPercent(discountBasisPoints, language))}</dt>
            <dd>−{money(discountMinor)}</dd>
          </>
        )}
        {taxBasisPoints > 0 && (
          <>
            <dt>{t.tax(formatPercent(taxBasisPoints, language))}</dt>
            <dd>{money(taxMinor)}</dd>
          </>
        )}
        <dt className="border-temp-ink border-t pt-1 font-semibold">{t.total}</dt>
        <dd className="border-temp-ink border-t pt-1 font-semibold">{money(totalMinor)}</dd>
      </dl>

      {notes && <p className="whitespace-pre-line break-inside-avoid">{notes}</p>}
    </article>
  );
}

type RowProps = {
  /** Label of the row. */
  label: string;
  /** Value of the row. */
  value: string;
};

function Row({ label, value }: RowProps): ReactElement {
  return (
    <>
      <dt className="text-temp-ink-muted">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
