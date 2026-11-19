import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { TextField } from '@/forms/TextField';
import { Button } from '@/ui/Button';
import { RequestStatus } from './RequestStatus';
import type { SetupRecovery } from './useSetupRecoveryPrototype';
import { useSetupText } from './useSetupText';

type ForgotFormProps = {
  /** Prototype state: request handler and the 429 countdown. */
  p: SetupRecovery;
};

/**
 * PROTOTYPE: e-mail field of "Passwort vergessen?"; the answer is the same for every e-mail.
 * @example <ForgotForm p={p} />
 */
export function ForgotForm({ p }: ForgotFormProps): ReactElement {
  const t = useSetupText().forgot;
  return (
    <Form
      onFormSubmit={(values) => p.handleRequestReset(String(values.email ?? ''))}
      className="flex flex-col gap-4"
    >
      <TextField name="email" label={t.email} type="email" autoComplete="username" required />
      <RequestStatus limitedSeconds={p.limitedSeconds} limitOver={p.limitOver} />
      <div>
        <Button variant="primary" type="submit" aria-disabled={p.limitedSeconds > 0}>
          {t.submit}
        </Button>
      </div>
    </Form>
  );
}
