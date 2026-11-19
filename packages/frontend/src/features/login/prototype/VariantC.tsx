import type { ReactElement, ReactNode } from 'react';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Page';
import { CredentialsForm } from './CredentialsForm';
import { ForgotForm } from './ForgotForm';
import { LogHelp } from './LogHelp';
import { LoginDialogMock } from './LoginDialogMock';
import { LogPreview } from './LogPreview';
import { RequestStatus } from './RequestStatus';
import { LOG_RULE, type LogLine, type SetupRecovery } from './useSetupRecoveryPrototype';
import { useSetupText } from './useSetupText';

type VariantProps = {
  /** Prototype state from `useSetupRecoveryPrototype`. */
  p: SetupRecovery;
};

// Static example: shows what to look for, never a working link
const SETUP_EXAMPLE: LogLine[] = [
  { id: 1, text: 'Listening on port 3000' },
  { id: 2, text: LOG_RULE },
  { id: 3, text: 'SETUP LINK  Open this link in your browser to create your login:', marker: true },
  { id: 4, text: '            http://localhost:3000/setup/xY3…' },
  { id: 5, text: '            Only the newest setup link works.' },
  { id: 6, text: LOG_RULE },
];

const RESET_EXAMPLE: LogLine[] = [
  { id: 1, text: LOG_RULE },
  {
    id: 2,
    text: 'RESET LINK  Password reset for julia@example.com, works once for 1 hour:',
    marker: true,
  },
  { id: 3, text: '            http://localhost:3000/reset/Qk8…' },
  { id: 4, text: LOG_RULE },
];

function Split({ example, children }: { example?: LogLine[]; children: ReactNode }): ReactElement {
  const t = useSetupText().setup;
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-10 pb-48 sm:px-8 lg:grid-cols-[1fr_minmax(0,32rem)]">
      <div className="flex flex-col gap-6">
        <span className="font-semibold text-temp-primary text-temp-wordmark tracking-tight">
          Dreck
        </span>
        {children}
      </div>
      {example && (
        <figure className="flex flex-col gap-3 self-start rounded-temp-card bg-temp-surface p-5 shadow-temp-card lg:sticky lg:top-8 lg:mt-16">
          <figcaption className="flex flex-col gap-1">
            <span className="font-medium text-xl">{t.lookLike}</span>
            <span className="text-sm text-temp-ink-muted">{t.lookLikeHint}</span>
          </figcaption>
          <LogPreview lines={example} label={t.lookLike} />
        </figure>
      )}
    </main>
  );
}

function WriteLink({ p }: VariantProps): ReactElement {
  const t = useSetupText().setup;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span>{t.noLink}</span>
      <Button
        variant="link"
        onClick={p.handleWriteLink}
        aria-disabled={p.limitedSeconds > 0}
        className="px-0"
      >
        {t.writeLink}
      </Button>
      <div className="basis-full">
        <RequestStatus
          limitedSeconds={p.limitedSeconds}
          limitOver={p.limitOver}
          success={p.linkWritten ? t.linkWritten : null}
        />
      </div>
    </div>
  );
}

/**
 * PROTOTYPE variant C "Log im Blick": text and accordion left, a sample of the log block
 * right, so the user knows what to look for before opening the log. The Docker Desktop
 * panel is open. Recovery is its own page with the RESET LINK sample. Form: name required
 * without a suggestion, eye icon in the password field.
 * @example <VariantC p={p} />
 */
export function VariantC({ p }: VariantProps): ReactElement {
  const t = useSetupText();

  switch (p.screen) {
    case 'setup':
      return (
        <Split example={SETUP_EXAMPLE}>
          <PageTitle>{t.setup.title}</PageTitle>
          <p className="text-lg">{t.setup.intro}</p>
          <p>{t.setup.whatIsLog}</p>
          <LogHelp defaultOpen={['desktop']} />
          <p className="text-temp-ink-muted">{t.setup.newestBottom}</p>
          <WriteLink p={p} />
        </Split>
      );
    case 'setup-form':
      return (
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 pb-40">
          <div className="flex flex-col gap-5 rounded-temp-card bg-temp-surface p-6 shadow-temp-card">
            <span className="font-semibold text-temp-primary text-temp-wordmark tracking-tight">
              Dreck
            </span>
            <h1 className="font-medium text-2xl tracking-tight">{t.form.title}</h1>
            <CredentialsForm
              nameMode="required"
              passwordMode="eye"
              submitLabel={t.form.submit}
              onSubmit={p.handleCompleteSetup}
            />
          </div>
        </main>
      );
    case 'setup-expired':
      return (
        <Split example={SETUP_EXAMPLE}>
          <PageTitle>{t.expired.title}</PageTitle>
          <p className="text-lg">{t.expired.setupBody}</p>
          <div>
            <Button
              variant="primary"
              onClick={p.handleWriteLink}
              aria-disabled={p.limitedSeconds > 0}
            >
              {t.setup.writeLink}
            </Button>
          </div>
          <RequestStatus
            limitedSeconds={p.limitedSeconds}
            limitOver={p.limitOver}
            success={p.linkWritten ? t.setup.linkWritten : null}
          />
          <LogHelp defaultOpen={['desktop']} />
        </Split>
      );
    case 'done':
      return (
        <Split>
          <PageTitle>{t.done.title}</PageTitle>
          <p>{t.done.body(p.admin.email)}</p>
          <div>
            <Button onClick={() => p.handleScreenChange('login')}>{t.done.again}</Button>
          </div>
        </Split>
      );
    case 'login':
      return <LoginDialogMock onForgot={() => p.handleScreenChange('forgot')} />;
    case 'forgot':
      return (
        <Split example={RESET_EXAMPLE}>
          <PageTitle>{t.forgot.title}</PageTitle>
          <p className="text-lg">{t.forgot.intro}</p>
          <div className="max-w-lg">
            <ForgotForm p={p} />
          </div>
          <BackToLogin p={p} />
        </Split>
      );
    case 'forgot-sent':
      return (
        <Split example={RESET_EXAMPLE}>
          <PageTitle>{t.forgot.sentTitle}</PageTitle>
          <p role="status" className="text-lg">
            {t.forgot.sent}
          </p>
          <p>{t.forgot.sentDetails}</p>
          <LogHelp defaultOpen={['desktop']} />
          <BackToLogin p={p} />
        </Split>
      );
    case 'reset':
      return (
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 pb-40">
          <div className="flex flex-col gap-5 rounded-temp-card bg-temp-surface p-6 shadow-temp-card">
            <span className="font-semibold text-temp-primary text-temp-wordmark tracking-tight">
              Dreck
            </span>
            <h1 className="font-medium text-2xl tracking-tight">{t.reset.title}</h1>
            <p>{t.reset.forEmail(p.resetEmail)}</p>
            <CredentialsForm
              nameMode="none"
              passwordMode="eye"
              submitLabel={t.reset.submit}
              onSubmit={p.handleCompleteReset}
              footnote={<p className="text-sm text-temp-ink-muted">{t.reset.sessions}</p>}
            />
          </div>
        </main>
      );
    case 'reset-expired':
      return (
        <Split example={RESET_EXAMPLE}>
          <PageTitle>{t.expired.title}</PageTitle>
          <p className="text-lg">{t.expired.resetBody}</p>
          <div>
            <Button variant="primary" onClick={() => p.handleScreenChange('forgot')}>
              {t.expired.requestNew}
            </Button>
          </div>
        </Split>
      );
  }
}

function BackToLogin({ p }: VariantProps): ReactElement {
  const t = useSetupText().forgot;
  return (
    <div>
      <Button variant="link" onClick={() => p.handleScreenChange('login')} className="px-0">
        {t.back}
      </Button>
    </div>
  );
}
