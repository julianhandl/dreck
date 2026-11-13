import type { Invoice } from '@dreck/shared/api/invoices';
import type { ReactElement } from 'react';
import { formatDate, formatDateRange } from '@/format/date';
import { formatPercent } from '@/format/decimal';
import { formatMoney } from '@/format/money';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { formatQuantity } from './invoice-display';

const NUM = 'py-2 pl-4 text-right align-top whitespace-nowrap';

type InvoiceDocumentProps = {
  /** The Invoice to show and print. */
  invoice: Invoice;
};

/**
 * The Invoice as the Customer gets it: sender from the settings, recipient, number, dates,
 * service period, items, totals and notes. It is the only part of the page that prints.
 * @example <InvoiceDocument invoice={invoice} />
 */
export function InvoiceDocument({ invoice }: InvoiceDocumentProps): ReactElement {
  const { language, messages } = useI18n();
  const settings = useSettings();
  const t = messages.invoices.document;
  const money = (minor: number): string => formatMoney(minor, settings.currency, language);
  const date = (d: string): string => formatDate(d, language);
  const { periodFrom, periodTo } = invoice;
  let period: string | null = null;
  if (periodFrom && periodTo) period = formatDateRange(periodFrom, periodTo, language);
  else if (periodFrom ?? periodTo) period = date(periodFrom ?? periodTo ?? '');

  return (
    <article className="flex flex-col gap-10 rounded-temp-card bg-temp-surface p-6 shadow-temp-card sm:p-12 print:rounded-none print:p-temp-print-page print:pl-temp-print-binding print:shadow-none print:box-decoration-clone">
      <header className="flex flex-wrap justify-between gap-6">
        <h2 className="font-semibold text-temp-page-title uppercase tracking-tight">{t.title}</h2>
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
          {invoice.recipient}
        </address>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
          <dt className="text-temp-ink-muted">{t.number}</dt>
          <dd className="font-semibold">{invoice.number}</dd>
          <dt className="text-temp-ink-muted">{t.issueDate}</dt>
          <dd>{date(invoice.issueDate)}</dd>
          <dt className="text-temp-ink-muted">{t.dueDate}</dt>
          <dd>{invoice.dueDate === invoice.issueDate ? t.uponReceipt : date(invoice.dueDate)}</dd>
          {period && (
            <>
              <dt className="text-temp-ink-muted">{t.period}</dt>
              <dd>{period}</dd>
            </>
          )}
        </dl>
      </div>

      {invoice.subject && <p className="font-semibold text-xl">{invoice.subject}</p>}

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
            {invoice.items.map((item) => (
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
        <dd>{money(invoice.subtotalMinor)}</dd>
        {invoice.discountBasisPoints > 0 && (
          <>
            <dt>{t.discount(formatPercent(invoice.discountBasisPoints, language))}</dt>
            <dd>−{money(invoice.discountMinor)}</dd>
          </>
        )}
        {invoice.taxBasisPoints > 0 && (
          <>
            <dt>{t.tax(formatPercent(invoice.taxBasisPoints, language))}</dt>
            <dd>{money(invoice.taxMinor)}</dd>
          </>
        )}
        <dt className="border-temp-ink border-t pt-1 font-semibold">{t.total}</dt>
        <dd className="border-temp-ink border-t pt-1 font-semibold">{money(invoice.totalMinor)}</dd>
      </dl>

      {invoice.notes && <p className="whitespace-pre-line break-inside-avoid">{invoice.notes}</p>}
    </article>
  );
}
