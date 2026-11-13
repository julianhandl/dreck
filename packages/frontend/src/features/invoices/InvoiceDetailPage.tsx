import type { Invoice } from '@dreck/shared/api/invoices';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { formatDate } from '@/format/date';
import { formatMoney } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { ActionsMenu, type MenuAction } from '@/ui/ActionsMenu';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Page';
import { BackLink } from './BackLink';
import { InvoiceDocument } from './InvoiceDocument';
import { InvoicePage } from './InvoicePage';
import { InvoiceStatusPill } from './InvoiceStatusPill';
import { displayStatus } from './invoice-display';
import { PaymentDialog } from './PaymentDialog';
import { useInvoiceDetail } from './useInvoiceDetail';

/**
 * One Invoice: status, amount due or paid, the status actions and print, below the document
 * as the Customer gets it. Only the document prints.
 * @example <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
 */
export function InvoiceDetailPage(): ReactElement {
  return <InvoicePage>{(invoice) => <InvoiceDetailContent invoice={invoice} />}</InvoicePage>;
}

type InvoiceDetailContentProps = {
  /** The Invoice of the URL. */
  invoice: Invoice;
};

function InvoiceDetailContent({ invoice }: InvoiceDetailContentProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const detail = useInvoiceDetail(invoice);
  const { submit } = detail;
  const t = messages.invoices.detail;
  const total = formatMoney(invoice.totalMinor, currency, language);
  const draft = invoice.status === 'draft';

  const actions: MenuAction[] = [];
  if (!draft)
    actions.push({ label: t.markDraft, onSelect: () => submit.handleSubmit('markDraft') });
  if (invoice.paidOn) {
    actions.push({ label: t.removePayment, onSelect: () => submit.handleSubmit('removePayment') });
  }
  if (draft) {
    actions.push({
      label: messages.common.delete,
      danger: true,
      onSelect: () => submit.handleSubmit('delete'),
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 print:hidden">
        <BackLink />
        <div className="flex flex-wrap items-center gap-4">
          <PageTitle>{t.title(invoice.number)}</PageTitle>
          <InvoiceStatusPill status={displayStatus(invoice, detail.today)} />
          <p className="text-lg sm:ml-auto">
            {invoice.paidOn
              ? t.summaryPaid(total, formatDate(invoice.paidOn, language))
              : t.summaryDue(total, formatDate(invoice.dueDate, language))}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {draft && (
            <Button as={Link} to={`/invoices/${invoice.id}/edit`} variant="primary">
              {t.edit}
            </Button>
          )}
          {draft && (
            <Button aria-disabled={submit.pending} onClick={() => submit.handleSubmit('markSent')}>
              {t.markSent}
            </Button>
          )}
          {!invoice.paidOn && (
            <Button onClick={() => detail.handlePaymentOpenChange(true)}>{t.recordPayment}</Button>
          )}
          <Button onClick={detail.handlePrint}>{t.print}</Button>
          {actions.length > 0 && (
            <ActionsMenu
              label={messages.common.actions}
              ariaLabel={messages.common.actionsFor(t.title(invoice.number))}
              actions={actions}
            />
          )}
        </div>
        {!draft && <p className="text-temp-ink-muted">{t.locked}</p>}
        <FormStatus submit={submit} />
      </div>
      <InvoiceDocument invoice={invoice} />
      <PaymentDialog
        open={detail.paymentOpen}
        onOpenChange={detail.handlePaymentOpenChange}
        paidOn={detail.paidOn}
        onPaidOnChange={detail.handlePaidOnChange}
        submit={detail.payment}
      />
    </>
  );
}
