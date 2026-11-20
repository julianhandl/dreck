import { Form } from '@base-ui/react/form';
import { Tabs } from '@base-ui/react/tabs';
import type { ReactElement, ReactNode } from 'react';
import { TextField } from '@/forms/TextField';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Page';
import { CredentialsForm } from './CredentialsForm';
import { ForgotForm } from './ForgotForm';
import { LOG_METHODS, LogMethodBody } from './LogHelp';
import { LoginDialogMock } from './LoginDialogMock';
import { RequestStatus } from './RequestStatus';
import { usePasteLink } from './usePasteLink';
import type { SetupRecovery } from './useSetupRecoveryPrototype';
import { useSetupText } from './useSetupText';

type VariantProps = {
  /** Prototype state from `useSetupRecoveryPrototype`. */
  p: SetupRecovery;
};

function Frame({ children }: { children: ReactNode }): ReactElement {
  return (
    <>
      <header className="border-temp-divider border-b bg-temp-band">
        <div className="mx-auto max-w-3xl px-4 py-4 font-semibold text-temp-primary text-temp-wordmark tracking-tight sm:px-8">
          Dreck
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-48 sm:px-8">
        {children}
      </main>
    </>
  );
}

export function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-3">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-full bg-temp-primary font-semibold text-lg text-temp-on-primary"
      >
        {number}
      </span>
      <h2 className="self-center font-medium text-xl">{title}</h2>
      <div className="col-start-2 flex flex-col gap-4">{children}</div>
    </li>
  );
}

/** Steps "Wie startest du Dreck?" → instructions → paste the link; tiles instead of an accordion. */
function LogSteps({ p, first }: VariantProps & { first: number }): ReactElement {
  const t = useSetupText();
  const paste = usePasteLink(p.handleOpenLink);
  return (
    <Tabs.Root defaultValue="desktop" render={<ol className="flex flex-col gap-8" />}>
      <Step number={first} title={t.setup.stepWhere}>
        <Tabs.List className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOG_METHODS.map((method) => (
            <Tabs.Tab
              key={method}
              value={method}
              className="min-h-16 rounded-temp-control border border-temp-border bg-temp-surface px-3 text-left font-medium hover:bg-temp-band data-active:border-temp-primary data-active:bg-temp-highlight data-active:ring-2 data-active:ring-temp-primary"
            >
              {t.logHelp[method].title}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Step>
      <Step number={first + 1} title={t.setup.stepOpen}>
        {LOG_METHODS.map((method) => (
          <Tabs.Panel key={method} value={method} className="flex flex-col gap-3">
            <LogMethodBody method={method} />
          </Tabs.Panel>
        ))}
        <p className="text-temp-ink-muted">{t.setup.newestBottom}</p>
      </Step>
      <Step number={first + 2} title={t.setup.stepPaste}>
        <p>{t.setup.stepPasteHint}</p>
        <Form
          errors={paste.errors}
          onFormSubmit={paste.handleSubmit}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-64 flex-1">
            <TextField
              name="link"
              label={t.setup.pasteLabel}
              description={t.setup.pasteHint}
              autoComplete="off"
              placeholder="http://localhost:3000/setup/…"
              value={paste.value}
              onValueChange={paste.handleValueChange}
            />
          </div>
          <Button variant="primary" type="submit" className="mb-7">
            {t.setup.open}
          </Button>
        </Form>
      </Step>
    </Tabs.Root>
  );
}

export function WriteLink({ p }: VariantProps): ReactElement {
  const t = useSetupText().setup;
  return (
    <div className="flex flex-col gap-2 border-temp-divider border-t pt-6">
      <p className="font-medium">{t.noLink}</p>
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
    </div>
  );
}

export function Callout({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-temp-card border border-temp-highlight-border bg-temp-highlight p-5">
      {children}
    </div>
  );
}

/**
 * PROTOTYPE variant B "Assistent mit Auswahl": numbered steps; the user picks how Dreck
 * runs and sees only that one instruction, then pastes the link into a field on this host.
 * Recovery is its own page. Form: no name field (taken from the e-mail), password twice.
 * @example <VariantB p={p} />
 */
export function VariantB({ p }: VariantProps): ReactElement {
  const t = useSetupText();

  switch (p.screen) {
    case 'setup':
      return (
        <Frame>
          <PageTitle>{t.setup.title}</PageTitle>
          <p className="text-lg">{t.setup.intro}</p>
          <LogSteps p={p} first={1} />
          <WriteLink p={p} />
        </Frame>
      );
    case 'setup-form':
      return (
        <Frame>
          <PageTitle>{t.form.title}</PageTitle>
          <p>{t.form.intro}</p>
          <div className="max-w-lg">
            <CredentialsForm
              nameMode="derived"
              passwordMode="repeat"
              submitLabel={t.form.submit}
              onSubmit={p.handleCompleteSetup}
            />
          </div>
        </Frame>
      );
    case 'setup-expired':
      return (
        <Frame>
          <Callout>
            <PageTitle>{t.expired.title}</PageTitle>
            <p>{t.expired.setupBody}</p>
          </Callout>
          <WriteLink p={p} />
          <LogSteps p={p} first={1} />
        </Frame>
      );
    case 'done':
      return (
        <Frame>
          <Callout>
            <PageTitle>{t.done.title}</PageTitle>
            <p>{t.done.body(p.admin.email)}</p>
          </Callout>
          <div>
            <Button onClick={() => p.handleScreenChange('login')}>{t.done.again}</Button>
          </div>
        </Frame>
      );
    case 'login':
      return <LoginDialogMock onForgot={() => p.handleScreenChange('forgot')} />;
    case 'forgot':
      return (
        <Frame>
          <PageTitle>{t.forgot.title}</PageTitle>
          <ol className="flex flex-col gap-8">
            <Step number={1} title={t.forgot.email}>
              <p>{t.forgot.intro}</p>
              <div className="max-w-lg">
                <ForgotForm p={p} />
              </div>
            </Step>
          </ol>
          <BackToLogin p={p} />
        </Frame>
      );
    case 'forgot-sent':
      return (
        <Frame>
          <PageTitle>{t.forgot.title}</PageTitle>
          <Callout>
            <h2 className="font-medium text-xl">{t.forgot.sentTitle}</h2>
            <p role="status">{t.forgot.sent}</p>
            <p>{t.forgot.sentDetails}</p>
          </Callout>
          <LogSteps p={p} first={2} />
          <BackToLogin p={p} />
        </Frame>
      );
    case 'reset':
      return (
        <Frame>
          <PageTitle>{t.reset.title}</PageTitle>
          <p>{t.reset.forEmail(p.resetEmail)}</p>
          <div className="max-w-lg">
            <CredentialsForm
              nameMode="none"
              passwordMode="repeat"
              submitLabel={t.reset.submit}
              onSubmit={p.handleCompleteReset}
              footnote={<p className="text-temp-ink-muted">{t.reset.sessions}</p>}
            />
          </div>
        </Frame>
      );
    case 'reset-expired':
      return (
        <Frame>
          <Callout>
            <PageTitle>{t.expired.title}</PageTitle>
            <p>{t.expired.resetBody}</p>
          </Callout>
          <div>
            <Button variant="primary" onClick={() => p.handleScreenChange('forgot')}>
              {t.expired.requestNew}
            </Button>
          </div>
        </Frame>
      );
  }
}

export function BackToLogin({ p }: VariantProps): ReactElement {
  const t = useSetupText().forgot;
  return (
    <div>
      <Button variant="link" onClick={() => p.handleScreenChange('login')}>
        {t.back}
      </Button>
    </div>
  );
}
