import type { ReactElement, ReactNode } from 'react';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Page';
import { CredentialsForm } from './CredentialsForm';
import { ForgotForm } from './ForgotForm';
import { LogHelp } from './LogHelp';
import { LoginDialogMock } from './LoginDialogMock';
import { RequestStatus } from './RequestStatus';
import type { SetupRecovery } from './useSetupRecoveryPrototype';
import { useSetupText } from './useSetupText';

type VariantProps = {
  /** Prototype state from `useSetupRecoveryPrototype`. */
  p: SetupRecovery;
};

function Column({ children }: { children: ReactNode }): ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-10 pb-48">
      <span className="font-semibold text-temp-primary text-temp-wordmark tracking-tight">
        Dreck
      </span>
      {children}
    </main>
  );
}

function WriteLink({ p }: VariantProps): ReactElement {
  const t = useSetupText().setup;
  return (
    <section className="flex flex-col gap-3 rounded-temp-card bg-temp-band p-5">
      <h2 className="font-medium">{t.noLink}</h2>
      <div>
        <Button onClick={p.handleWriteLink} aria-disabled={p.limitedSeconds > 0}>
          {t.writeLink}
        </Button>
      </div>
      <RequestStatus
        limitedSeconds={p.limitedSeconds}
        limitOver={p.limitOver}
        success={p.linkWritten ? t.linkWritten : null}
      />
    </section>
  );
}

/**
 * PROTOTYPE variant A "Accordion-Seite": one calm text column, the log help as a closed
 * accordion, recovery inside the login dialog. Form: name optional with a suggestion from
 * the e-mail, checkbox "Passwort anzeigen", live counter to 15 characters.
 * @example <VariantA p={p} />
 */
export function VariantA({ p }: VariantProps): ReactElement {
  const t = useSetupText();

  switch (p.screen) {
    case 'setup':
      return (
        <Column>
          <PageTitle>{t.setup.title}</PageTitle>
          <p className="text-lg">{t.setup.intro}</p>
          <p>{t.setup.whatIsLog}</p>
          <p className="text-temp-ink-muted">{t.setup.newestBottom}</p>
          <LogHelp />
          <WriteLink p={p} />
        </Column>
      );
    case 'setup-form':
      return (
        <Column>
          <PageTitle>{t.form.title}</PageTitle>
          <p>{t.form.intro}</p>
          <CredentialsForm
            nameMode="suggested"
            passwordMode="toggle"
            submitLabel={t.form.submit}
            onSubmit={p.handleCompleteSetup}
          />
        </Column>
      );
    case 'setup-expired':
      return (
        <Column>
          <PageTitle>{t.expired.title}</PageTitle>
          <p>{t.expired.setupBody}</p>
          <WriteLink p={p} />
          <LogHelp />
        </Column>
      );
    case 'done':
      return <Done p={p} />;
    case 'login':
      return <LoginDialogMock onForgot={() => p.handleScreenChange('forgot')} />;
    case 'forgot':
      return (
        <LoginDialogMock onForgot={() => undefined} title={t.forgot.title}>
          <p>{t.forgot.intro}</p>
          <ForgotForm p={p} />
          <BackToLogin p={p} />
        </LoginDialogMock>
      );
    case 'forgot-sent':
      return (
        <LoginDialogMock onForgot={() => undefined} title={t.forgot.sentTitle}>
          <p role="status">{t.forgot.sent}</p>
          <p className="text-temp-ink-muted">{t.forgot.sentDetails}</p>
          <LogHelp headingLevel={3} />
          <BackToLogin p={p} />
        </LoginDialogMock>
      );
    case 'reset':
      return (
        <Column>
          <PageTitle>{t.reset.title}</PageTitle>
          <p>{t.reset.forEmail(p.resetEmail)}</p>
          <CredentialsForm
            nameMode="none"
            passwordMode="toggle"
            submitLabel={t.reset.submit}
            onSubmit={p.handleCompleteReset}
            footnote={<p className="text-temp-ink-muted">{t.reset.sessions}</p>}
          />
        </Column>
      );
    case 'reset-expired':
      return (
        <Column>
          <PageTitle>{t.expired.title}</PageTitle>
          <p>{t.expired.resetBody}</p>
          <div>
            <Button variant="primary" onClick={() => p.handleScreenChange('forgot')}>
              {t.expired.requestNew}
            </Button>
          </div>
        </Column>
      );
  }
}

function BackToLogin({ p }: VariantProps): ReactElement {
  const t = useSetupText().forgot;
  return (
    <div>
      <Button variant="link" onClick={() => p.handleScreenChange('login')}>
        {t.back}
      </Button>
    </div>
  );
}

function Done({ p }: VariantProps): ReactElement {
  const t = useSetupText().done;
  return (
    <Column>
      <PageTitle>{t.title}</PageTitle>
      <p>{t.body(p.admin.email)}</p>
      <div>
        <Button onClick={() => p.handleScreenChange('login')}>{t.again}</Button>
      </div>
    </Column>
  );
}
