import { type ReactElement, type ReactNode, useState } from 'react';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Page';
import { BrowserMock } from './BrowserMock';
import { CredentialsForm } from './CredentialsForm';
import { ForgotForm } from './ForgotForm';
import { type LogMethod, LogMethodBody } from './LogHelp';
import { LoginDialogMock } from './LoginDialogMock';
import { LogPreview } from './LogPreview';
import { StartMethodPicker } from './StartMethodPicker';
import type { SetupRecovery } from './useSetupRecoveryPrototype';
import { useSetupText } from './useSetupText';
import { BackToLogin, Callout, Step, WriteLink } from './VariantB';
import { RESET_EXAMPLE, SETUP_EXAMPLE } from './VariantC';

type VariantProps = {
  /** Prototype state from `useSetupRecoveryPrototype`. */
  p: SetupRecovery;
};

const CARD = 'flex flex-col gap-6 rounded-temp-card bg-temp-surface p-6 shadow-temp-card sm:p-8';

function Wordmark(): ReactElement {
  return (
    <span className="font-semibold text-temp-primary text-temp-wordmark tracking-tight">Dreck</span>
  );
}

/** One column: the steps in a dialog-like card as in variant C. */
function Split({ children }: { children: ReactNode }): ReactElement {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-10 pb-48 sm:px-8">
      <div className={CARD}>
        <Wordmark />
        {children}
      </div>
    </main>
  );
}

/** Variant C's centred dialog card for the forms behind the links. */
function DialogCard({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 pb-40">
      <div className="flex flex-col gap-5 rounded-temp-card bg-temp-surface p-6 shadow-temp-card">
        <Wordmark />
        <h1 className="font-medium text-2xl tracking-tight">{title}</h1>
        {children}
      </div>
    </main>
  );
}

/** Steps: how Dreck was started (cards) → how to open the log → paste into the address bar. */
function LogSteps({ first, kind }: { first: number; kind: 'setup' | 'reset' }): ReactElement {
  const t = useSetupText().setup;
  const [method, setMethod] = useState<LogMethod>('desktop');
  return (
    <ol className="flex flex-col gap-8">
      <Step number={first} title={t.stepWhere}>
        <StartMethodPicker value={method} onChange={setMethod} legend={t.stepWhere} />
      </Step>
      <Step number={first + 1} title={t.stepOpen}>
        <LogMethodBody method={method} />
        <p>{t.whatIsLog}</p>
        <figure className="flex flex-col gap-2">
          <figcaption className="flex flex-col gap-1">
            <span className="font-medium">{t.lookLike}</span>
            <span className="text-sm text-temp-ink-muted">{t.lookLikeHint}</span>
          </figcaption>
          <LogPreview lines={kind === 'setup' ? SETUP_EXAMPLE : RESET_EXAMPLE} label={t.lookLike} />
        </figure>
        <p className="text-temp-ink-muted">{t.newestBottom}</p>
      </Step>
      <Step number={first + 2} title={t.stepBrowser}>
        <p>{t.stepBrowserBody}</p>
        <BrowserMock kind={kind} />
      </Step>
    </ol>
  );
}

/**
 * PROTOTYPE variant D "B + C kombiniert": B's numbered steps with the start methods as stacked
 * cards showing the README start command, the browser address bar instead of a paste field,
 * C's log sample inside step 2, one column in C's dialog card. Form fields as in B.
 * @example <VariantD p={p} />
 */
export function VariantD({ p }: VariantProps): ReactElement {
  const t = useSetupText();

  switch (p.screen) {
    case 'setup':
      return (
        <Split>
          <PageTitle>{t.setup.title}</PageTitle>
          <p className="text-lg">{t.setup.intro}</p>
          <LogSteps first={1} kind="setup" />
          <WriteLink p={p} />
        </Split>
      );
    case 'setup-form':
      return (
        <DialogCard title={t.form.title}>
          <p>{t.form.intro}</p>
          <CredentialsForm
            nameMode="derived"
            passwordMode="repeat"
            submitLabel={t.form.submit}
            onSubmit={p.handleCompleteSetup}
          />
        </DialogCard>
      );
    case 'setup-expired':
      return (
        <Split>
          <Callout>
            <PageTitle>{t.expired.title}</PageTitle>
            <p>{t.expired.setupBody}</p>
          </Callout>
          <WriteLink p={p} />
          <LogSteps first={1} kind="setup" />
        </Split>
      );
    case 'done':
      return (
        <DialogCard title={t.done.title}>
          <p>{t.done.body(p.admin.email)}</p>
          <div>
            <Button onClick={() => p.handleScreenChange('login')}>{t.done.again}</Button>
          </div>
        </DialogCard>
      );
    case 'login':
      return <LoginDialogMock onForgot={() => p.handleScreenChange('forgot')} />;
    case 'forgot':
      return (
        <DialogCard title={t.forgot.title}>
          <p>{t.forgot.intro}</p>
          <ForgotForm p={p} />
          <BackToLogin p={p} />
        </DialogCard>
      );
    case 'forgot-sent':
      return (
        <Split>
          <PageTitle>{t.forgot.sentTitle}</PageTitle>
          <p role="status" className="text-lg">
            {t.forgot.sent}
          </p>
          <p>{t.forgot.sentDetails}</p>
          <LogSteps first={1} kind="reset" />
          <BackToLogin p={p} />
        </Split>
      );
    case 'reset':
      return (
        <DialogCard title={t.reset.title}>
          <p>{t.reset.forEmail(p.resetEmail)}</p>
          <CredentialsForm
            nameMode="none"
            passwordMode="repeat"
            submitLabel={t.reset.submit}
            onSubmit={p.handleCompleteReset}
            footnote={<p className="text-sm text-temp-ink-muted">{t.reset.sessions}</p>}
          />
        </DialogCard>
      );
    case 'reset-expired':
      return (
        <DialogCard title={t.expired.title}>
          <p>{t.expired.resetBody}</p>
          <div>
            <Button variant="primary" onClick={() => p.handleScreenChange('forgot')}>
              {t.expired.requestNew}
            </Button>
          </div>
        </DialogCard>
      );
  }
}
