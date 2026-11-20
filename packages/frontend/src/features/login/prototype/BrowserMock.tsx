import type { ReactElement } from 'react';
import { Button } from '@/ui/Button';
import { useBrowserMock } from './useBrowserMock';
import { ORIGIN } from './useSetupRecoveryPrototype';
import { useSetupText } from './useSetupText';

type BrowserMockProps = {
  /** Which link goes into the address bar. */
  kind: 'setup' | 'reset';
};

/**
 * PROTOTYPE: a small browser window that shows, as a loop, how the link from the log goes
 * into the address bar: click, paste, Enter, then the setup form. The steps are also text.
 * @example <BrowserMock kind="setup" />
 */
export function BrowserMock({ kind }: BrowserMockProps): ReactElement {
  const text = useSetupText();
  const t = text.setup;
  const { phase, playing, handleTogglePlay } = useBrowserMock();
  const current = Math.max(0, Math.min(phase - 1, t.browserPhases.length - 1));
  const address = phase >= 2 ? `${ORIGIN}/${kind}/xY3kP9…` : `${ORIGIN}/`;

  return (
    <figure className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-temp-control border border-temp-border bg-temp-canvas shadow-temp-card"
      >
        <div className="flex items-center gap-3 border-temp-divider border-b bg-temp-band px-3 py-2">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-temp-border" />
            <span className="size-2.5 rounded-full bg-temp-border" />
            <span className="size-2.5 rounded-full bg-temp-border" />
          </span>
          <span
            className={`flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-temp-pill bg-temp-surface px-3 font-mono text-xs transition-shadow ${
              phase >= 1 && phase <= 3 ? 'ring-2 ring-temp-focus' : ''
            }`}
          >
            <span
              className={`truncate ${phase === 1 ? 'bg-temp-selected text-temp-on-selected' : ''}`}
            >
              {address}
            </span>
            {phase === 2 && <Keycap>{t.pasteKey}</Keycap>}
            {phase === 3 && <Keycap pressed>Enter ↵</Keycap>}
          </span>
        </div>
        <div className="grid min-h-36 place-items-center p-4">
          {phase === 4 ? (
            <div className="flex w-48 flex-col gap-2 rounded-temp-control bg-temp-surface p-3 shadow-temp-card">
              <span className="font-semibold text-temp-primary text-xs">Dreck</span>
              <span className="font-medium text-sm">
                {kind === 'setup' ? text.form.title : text.reset.title}
              </span>
              <span className="h-5 rounded border border-temp-border" />
              <span className="h-5 rounded border border-temp-border" />
              <span className="h-5 w-16 rounded bg-temp-primary" />
            </div>
          ) : (
            <span className="font-medium text-temp-ink-muted">
              {kind === 'setup' ? t.title : text.forgot.sentTitle}
            </span>
          )}
        </div>
      </div>
      <figcaption className="flex flex-col gap-2">
        <span className="sr-only">{t.browserMock}</span>
        <ol className="flex flex-col gap-1 text-sm" aria-hidden="true">
          {t.browserPhases.map((label, index) => (
            <li
              key={label}
              className={
                phase > 0 && index === current ? 'font-medium text-temp-ink' : 'text-temp-ink-muted'
              }
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        <div>
          <Button size="sm" variant="ghost" onClick={handleTogglePlay} aria-pressed={!playing}>
            {playing ? t.pause : t.play}
          </Button>
        </div>
      </figcaption>
    </figure>
  );
}

function Keycap({
  children,
  pressed = false,
}: {
  children: string;
  pressed?: boolean;
}): ReactElement {
  return (
    <kbd
      className={`ml-auto shrink-0 rounded border border-temp-border px-1.5 py-0.5 font-sans text-[0.7rem] ${
        pressed ? 'translate-y-px bg-temp-band' : 'bg-temp-surface shadow-temp-card'
      }`}
    >
      {children}
    </kbd>
  );
}
