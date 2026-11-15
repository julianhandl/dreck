import type { Estimate, UpdateEstimate } from '@dreck/shared/api/estimates';
import type { Invoice } from '@dreck/shared/api/invoices';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import { useToday } from '@/clock/useNow';
import { addDays } from '@/format/calendar';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';

export type EstimateCommand =
  | 'markSent'
  | 'accept'
  | 'decline'
  | 'backToSent'
  | 'backToDraft'
  | 'createInvoice'
  | 'delete';

export type EstimateDetail = {
  today: string;
  submit: Submit<EstimateCommand>;
  handlePrint: () => void;
};

/** Days between issue and due date of an Invoice made from an Estimate. */
const PAYMENT_DAYS = 14;

/**
 * Status actions of one Estimate (sent, accepted, declined, back, create invoice, delete) and
 * printing. The tab title names the Estimate, so "Save as PDF" suggests it as file name.
 */
export function useEstimateDetail(estimate: Estimate): EstimateDetail {
  const today = useToday();
  const navigate = useNavigate();
  const { messages } = useI18n();
  const path = `/estimates/${estimate.id}`;
  const documentTitle = `${messages.estimates.document.title} ${estimate.number}`;

  useEffect(() => {
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  const submit = useSubmit(async (command: EstimateCommand) => {
    if (command === 'delete') {
      if (!window.confirm(messages.estimates.actions.confirmDelete(estimate.number))) return;
      await api.delete(path);
      navigate('/estimates');
      return;
    }
    if (command === 'createInvoice') {
      const created = await api.post<Invoice>('/invoices', {
        customerId: estimate.customerId,
        recipient: estimate.recipient,
        issueDate: today,
        dueDate: addDays(today, PAYMENT_DAYS),
        ...(estimate.subject && { subject: estimate.subject }),
        taxBasisPoints: estimate.taxBasisPoints,
        discountBasisPoints: estimate.discountBasisPoints,
        items: estimate.items.map(({ description, quantityHundredths, unitPriceMinor }) => ({
          description,
          quantityHundredths,
          unitPriceMinor,
        })),
      });
      navigate(`/invoices/${created.id}/edit`);
      return;
    }
    const changes: Record<Exclude<EstimateCommand, 'delete' | 'createInvoice'>, UpdateEstimate> = {
      markSent: { sentOn: today },
      accept: { acceptedOn: today },
      decline: { declinedOn: today },
      backToSent: { acceptedOn: null, declinedOn: null },
      backToDraft: { sentOn: null, acceptedOn: null, declinedOn: null },
    };
    await api.patch(path, changes[command]);
  });

  return { today, submit, handlePrint: () => window.print() };
}
