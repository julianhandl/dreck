import type { Login } from '@dreck/shared/api/auth';
import { api } from '@/api/api-client';
import { completeLogin, useLoginRequired } from '@/api/login-gate';
import { type Submit, useSubmit } from '@/forms/useSubmit';

type LoginDialog = {
  /** A request waits for the login. */
  open: boolean;
  /** Plain HTTP on a host other than localhost: the session cookie would not stick. */
  insecure: boolean;
  submit: Submit<Login>;
};

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

/** State of the login dialog: open while a request got a 401. */
export function useLoginDialog(): LoginDialog {
  const open = useLoginRequired();
  const submit = useSubmit(
    async (values: Login) => {
      await api.post('/auth/login', values);
      completeLogin();
    },
    { fields: { unauthorized: 'password', rate_limited: 'password' } },
  );
  const insecure =
    window.location.protocol === 'http:' && !LOCAL_HOSTS.includes(window.location.hostname);
  return { open, insecure, submit };
}
