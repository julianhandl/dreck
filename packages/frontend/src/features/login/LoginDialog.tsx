import { Dialog } from '@base-ui/react/dialog';
import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { useLoginDialog } from './useLoginDialog';

/**
 * Login over the current page while a request got a 401; the page keeps its input and the
 * request runs again after the login. Cannot be dismissed. Over plain HTTP on another host
 * than localhost it only says "Nur über HTTPS nutzbar".
 * @example <LoginDialog />
 */
export function LoginDialog(): ReactElement {
  const { messages } = useI18n();
  const { open, insecure, submit } = useLoginDialog();

  return (
    <Dialog.Root open={open} disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-temp-backdrop" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 mx-auto flex max-w-md -translate-y-1/2 max-sm:top-auto max-sm:bottom-4 max-sm:translate-y-0 flex-col gap-4 rounded-temp-card bg-temp-surface p-6 text-temp-ink">
          <Dialog.Title className="font-semibold text-xl">{messages.login.title}</Dialog.Title>
          <Dialog.Description>
            {insecure ? messages.login.httpsOnly : messages.login.hint}
          </Dialog.Description>
          {!insecure && (
            <Form
              ref={submit.formRef}
              errors={submit.errors}
              onFormSubmit={submit.handleSubmit}
              className="flex flex-col gap-4"
            >
              <TextField
                name="password"
                label={messages.login.password}
                type="password"
                autoComplete="current-password"
                required
              />
              <FormStatus submit={submit} />
              <Button variant="primary" type="submit" aria-disabled={submit.pending}>
                {messages.login.submit}
              </Button>
            </Form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
