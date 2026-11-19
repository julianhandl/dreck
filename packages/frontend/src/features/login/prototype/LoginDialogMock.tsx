import { Dialog } from '@base-ui/react/dialog';
import { Form } from '@base-ui/react/form';
import type { ReactElement, ReactNode } from 'react';
import { TextField } from '@/forms/TextField';
import { Button } from '@/ui/Button';
import { useSetupText } from './useSetupText';

type LoginDialogMockProps = {
  /** "Passwort vergessen?" was clicked. */
  onForgot: () => void;
  /** Replaces the login form, e.g. the recovery request inside the dialog (variant A). */
  children?: ReactNode;
  /** Heading while `children` replace the form. */
  title?: string;
};

/**
 * PROTOTYPE: the future login dialog with e-mail and password over an empty page, styled
 * like `LoginDialog`; the login itself does nothing.
 * @example <LoginDialogMock onForgot={() => go('forgot')} />
 */
export function LoginDialogMock({ onForgot, children, title }: LoginDialogMockProps): ReactElement {
  const t = useSetupText().login;
  return (
    <Dialog.Root open disablePointerDismissal modal={false}>
      <Dialog.Portal>
        <div className="fixed inset-0 bg-temp-backdrop" />
        <Dialog.Popup className="fixed inset-x-4 top-[8vh] mx-auto flex max-h-[78vh] max-w-md flex-col gap-4 overflow-y-auto rounded-temp-card bg-temp-surface p-6 text-temp-ink max-sm:top-4">
          <Dialog.Title className="font-semibold text-xl">{title ?? t.title}</Dialog.Title>
          {children ?? (
            <Form onFormSubmit={() => undefined} className="flex flex-col gap-4">
              <TextField
                name="email"
                label={t.email}
                type="email"
                autoComplete="username"
                required
              />
              <TextField
                name="password"
                label={t.password}
                type="password"
                autoComplete="current-password"
                required
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="primary" type="submit">
                  {t.submit}
                </Button>
                <Button variant="link" onClick={onForgot}>
                  {t.forgot}
                </Button>
              </div>
            </Form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
