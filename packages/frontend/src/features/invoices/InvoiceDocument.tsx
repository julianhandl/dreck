import type { Invoice } from '@dreck/shared/api/invoices';
import type { ReactElement } from 'react';
import { DocumentView } from '@/features/documents/DocumentView';
import { formatDate, formatDateRange } from '@/format/date';
import { useI18n } from '@/i18n/useI18n';

type InvoiceDocumentProps = {
  /** The Invoice to show and print. */
  invoice: Invoice;
};

/**
 * The Invoice as the Customer gets it: number, dates, due date and service period around the
 * shared document. It is the only part of the page that prints.
 * @example <InvoiceDocument invoice={invoice} />
 */
export function InvoiceDocument({ invoice }: InvoiceDocumentProps): ReactElement {
  const { language, messages } = useI18n();
  const t = messages.invoices.document;
  const date = (d: string): string => formatDate(d, language);
  const { periodFrom, periodTo } = invoice;
  let period: string | null = null;
  if (periodFrom && periodTo) period = formatDateRange(periodFrom, periodTo, language);
  else if (periodFrom ?? periodTo) period = date(periodFrom ?? periodTo ?? '');

  return (
    <DocumentView
      {...invoice}
      title={t.title}
      numberLabel={t.number}
      dates={[
        { label: t.issueDate, value: date(invoice.issueDate) },
        {
          label: t.dueDate,
          value: invoice.dueDate === invoice.issueDate ? t.uponReceipt : date(invoice.dueDate),
        },
        ...(period ? [{ label: t.period, value: period }] : []),
      ]}
    />
  );
}
