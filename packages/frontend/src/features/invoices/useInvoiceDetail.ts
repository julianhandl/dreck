import type { Invoice, UpdateInvoice } from '@dreck/shared/api/invoices';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/api-client';
import { useToday } from '@/clock/useNow';
import { type Submit, useSubmit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';

type Command = 'markSent' | 'markDraft' | 'removePayment' | 'delete';

export type InvoiceDetail = {
  today: string;
  submit: Submit<Command>;
  /** "Zahlung erfassen" is open. */
  paymentOpen: boolean;
  paidOn: string;
  payment: Submit<null>;
  handlePaymentOpenChange: (open: boolean) => void;
  handlePaidOnChange: (value: string) => void;
  handlePrint: () => void;
};

/**
 * Status actions of one Invoice (sent, paid, back to draft, delete) and printing. The tab title
 * names the Invoice, so "Save as PDF" suggests it as file name.
 */
export function useInvoiceDetail(invoice: Invoice): InvoiceDetail {
  const today = useToday();
  const navigate = useNavigate();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paidOn, setPaidOn] = useState(today);
  const path = `/invoices/${invoice.id}`;
  const documentTitle = `${useI18n().messages.invoices.document.title} ${invoice.number}`;

  useEffect(() => {
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  const submit = useSubmit(async (command: Command) => {
    if (command === 'delete') {
      await api.delete(path);
      navigate('/invoices');
      return;
    }
    const changes: Record<Exclude<Command, 'delete'>, UpdateInvoice> = {
      markSent: { sentOn: today },
      markDraft: { sentOn: null, paidOn: null },
      removePayment: { paidOn: null },
    };
    await api.patch(path, changes[command]);
  });

  const payment = useSubmit(async () => {
    await api.patch(path, { paidOn, sentOn: invoice.sentOn ?? paidOn });
    setPaymentOpen(false);
  });

  return {
    today,
    submit,
    paymentOpen,
    paidOn,
    payment,
    handlePaymentOpenChange: (open) => {
      if (open) setPaidOn(today);
      setPaymentOpen(open);
    },
    handlePaidOnChange: setPaidOn,
    handlePrint: () => window.print(),
  };
}
