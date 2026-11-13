import type { Invoice } from '@dreck/shared/api/invoices';
import { useParams } from 'react-router';
import { type QueryState, useQuery } from '@/api/useQuery';

/** The Invoice of `:invoiceId` plus all Invoices; `invoice` is undefined for an unknown id. */
export function useInvoiceRoute(): QueryState<{
  invoice: Invoice | undefined;
  invoices: Invoice[];
}> {
  const { invoiceId } = useParams();
  // No GET /invoices/:id in the API; the list is small
  const state = useQuery<Invoice[]>('/invoices');
  if (state.status !== 'ready') return state;
  return {
    status: 'ready',
    data: { invoice: state.data.find((i) => String(i.id) === invoiceId), invoices: state.data },
  };
}
