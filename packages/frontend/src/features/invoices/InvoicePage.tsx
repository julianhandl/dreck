import type { Invoice } from '@dreck/shared/api/invoices';
import type { ReactElement, ReactNode } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { Page } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { BackLink } from './BackLink';
import { useInvoiceRoute } from './useInvoiceRoute';

type InvoicePageProps = {
  /** Renders the Invoice of the URL; gets all Invoices too. */
  children: (invoice: Invoice, invoices: Invoice[]) => ReactNode;
};

/**
 * Page frame for one Invoice: loads it by `:invoiceId`, shows "Nicht gefunden" otherwise.
 * @example <InvoicePage>{(invoice) => <InvoiceDocument invoice={invoice} />}</InvoicePage>
 */
export function InvoicePage({ children }: InvoicePageProps): ReactElement {
  const { messages } = useI18n();
  return (
    <Page>
      <QueryView state={useInvoiceRoute()}>
        {({ invoice, invoices }) =>
          invoice ? (
            children(invoice, invoices)
          ) : (
            <>
              <BackLink />
              <p>{messages.errors.not_found}</p>
            </>
          )
        }
      </QueryView>
    </Page>
  );
}
