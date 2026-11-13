import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import type { Submit } from '@/forms/useSubmit';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';

type PaymentDialogProps = {
  /** Whether the dialog is open; the state lives in `useInvoiceDetail`. */
  open: boolean;
  /** Called on Escape, "Abbrechen" and a click outside. */
  onOpenChange: (open: boolean) => void;
  /** Date of the payment. */
  paidOn: string;
  /** Called with the new date. */
  onPaidOnChange: (value: string) => void;
  /** Saves the payment. */
  submit: Submit<null>;
};

/**
 * Dialog "Zahlung erfassen": the date the Invoice was paid in full, today by default.
 * @example <PaymentDialog open={open} onOpenChange={setOpen} paidOn={date} onPaidOnChange={setDate} submit={payment} />
 */
export function PaymentDialog({
  open,
  onOpenChange,
  paidOn,
  onPaidOnChange,
  submit,
}: PaymentDialogProps): ReactElement {
  const { messages } = useI18n();
  const t = messages.invoices.detail;
  return (
    <Modal title={t.recordPayment} open={open} onOpenChange={onOpenChange}>
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit(null)}
        className="flex flex-col gap-4"
      >
        <TextField
          name="paidOn"
          label={t.paidOn}
          type="date"
          required
          value={paidOn}
          onValueChange={onPaidOnChange}
        />
        <FormStatus submit={submit} />
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" type="submit" aria-disabled={submit.pending}>
            {t.savePayment}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{messages.common.cancel}</Button>
        </div>
      </Form>
    </Modal>
  );
}
