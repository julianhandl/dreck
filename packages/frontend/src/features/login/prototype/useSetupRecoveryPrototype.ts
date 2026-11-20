// PROTOTYPE (branch prototype/setup-recovery-page): in-memory stand-in for the setup and
// recovery API. No backend, nothing persisted; a reload starts over.
import { LANGUAGES, type Language } from '@dreck/shared/i18n';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useNow } from '@/clock/useNow';
import { browserLanguage } from '@/i18n/browser-language';

export const VARIANTS = [
  { key: 'A', name: 'Accordion-Seite' },
  { key: 'B', name: 'Assistent mit Auswahl' },
  { key: 'C', name: 'Log im Blick' },
  { key: 'D', name: 'B + C kombiniert' },
] as const;

export type VariantKey = (typeof VARIANTS)[number]['key'];

export const SCREENS = [
  'setup',
  'setup-form',
  'setup-expired',
  'done',
  'login',
  'forgot',
  'forgot-sent',
  'reset',
  'reset-expired',
] as const;

export type Screen = (typeof SCREENS)[number];

export type LogLine = {
  id: number;
  text: string;
  /** Marks the line that holds a link; the simulated log makes it clickable. */
  link?: string;
  /** Start of a link block, highlighted in the log. */
  marker?: boolean;
};

type Admin = { email: string; name: string };

export const ORIGIN = 'http://localhost:3000';
const RETRY_AFTER_SECONDS = 30;
// Admin for the login and recovery screens when the setup was skipped via the URL
const DEMO_ADMIN: Admin = { email: 'julia.beispiel@example.com', name: 'Julia Beispiel' };
export const LOG_RULE = '-'.repeat(66);

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_');
}

let nextId = 1;
function lines(...texts: (string | Omit<LogLine, 'id'>)[]): LogLine[] {
  return texts.map((text) => ({
    id: nextId++,
    ...(typeof text === 'string' ? { text } : text),
  }));
}

function setupBlock(token: string): LogLine[] {
  const url = `${ORIGIN}/setup/${token}`;
  return lines(
    LOG_RULE,
    { text: 'SETUP LINK  Open this link in your browser to create your login:', marker: true },
    { text: `            ${url}`, link: url },
    '            Only the newest setup link works.',
    LOG_RULE,
  );
}

function resetBlock(email: string, token: string): LogLine[] {
  const url = `${ORIGIN}/reset/${token}`;
  return lines(
    LOG_RULE,
    { text: `RESET LINK  Password reset for ${email}, works once for 1 hour:`, marker: true },
    { text: `            ${url}`, link: url },
    LOG_RULE,
  );
}

/** Suggests a name from the part before the @: `julia.beispiel@…` → "Julia Beispiel". */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  return local
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Characters still missing to the minimum of 15; counts code points, not UTF-16 units. */
export function passwordCharsLeft(password: string): number {
  return Math.max(0, 15 - [...password].length);
}

export type SetupRecovery = {
  variant: VariantKey;
  screen: Screen;
  language: Language;
  /** `?mock=429`: every link request answers `429` with `Retry-After`. */
  mock429: boolean;
  log: LogLine[];
  admin: Admin;
  /** E-mail of the account behind the open reset link. */
  resetEmail: string;
  /** Seconds left from `Retry-After`; 0 = not limited. */
  limitedSeconds: number;
  /** The last 429 ran out; shows "Du kannst es jetzt noch einmal versuchen". */
  limitOver: boolean;
  /** Confirmation after "Neuen Link in den Log schreiben". */
  linkWritten: boolean;
  handleScreenChange: (screen: Screen) => void;
  handleVariantChange: (variant: VariantKey) => void;
  handleLanguageChange: (language: Language) => void;
  handleMock429Change: (on: boolean) => void;
  handleWriteLink: () => void;
  handleRequestReset: (email: string) => void;
  /** Opens a link from the log or the paste field; `false` if it is none. */
  handleOpenLink: (link: string) => boolean;
  handleCompleteSetup: (admin: Admin) => void;
  handleCompleteReset: () => void;
};

/** State of the setup/recovery prototype: URL params, simulated log and fake requests. */
export function useSetupRecoveryPrototype(): SetupRecovery {
  const [params, setParams] = useSearchParams();
  const [setupToken, setSetupToken] = useState(randomToken);
  const [log, setLog] = useState<LogLine[]>(() => [
    ...lines('Dreck 2.0.0', 'Applied migrations: 0014_users', 'Listening on port 3000'),
    ...setupBlock(setupToken),
  ]);
  const [admin, setAdmin] = useState<Admin>(DEMO_ADMIN);
  const [resetTokens, setResetTokens] = useState<Record<string, string>>({});
  const [limitedUntil, setLimitedUntil] = useState(0);
  const [linkWritten, setLinkWritten] = useState(false);
  const now = useNow(limitedUntil > 0);

  const variant = VARIANTS.find((v) => v.key === params.get('variant'))?.key ?? 'A';
  const language = LANGUAGES.find((l) => l === params.get('lang')) ?? browserLanguage();
  const mock429 = params.get('mock') === '429';
  const requested = SCREENS.find((s) => s === params.get('screen')) ?? 'setup';
  const token = params.get('token');

  // A token in the URL must be the newest one, otherwise the link is dead
  let screen: Screen = requested;
  if (requested === 'setup-form' && token !== null && token !== setupToken) {
    screen = 'setup-expired';
  }
  const resetEmail =
    Object.entries(resetTokens).find(([, value]) => value === token)?.[0] ?? admin.email;
  if (requested === 'reset' && token !== null && !Object.values(resetTokens).includes(token)) {
    screen = 'reset-expired';
  }

  // Every screen starts at the top, like a page load
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on screen change on purpose
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const limitedSeconds = Math.max(0, Math.ceil((limitedUntil - now) / 1000));

  function update(changes: Record<string, string | null>): void {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  }

  // Simulates POST …/setup-link and POST …/recovery: false = answered 429
  function allowed(): boolean {
    if (!mock429) return true;
    setLimitedUntil(Date.now() + RETRY_AFTER_SECONDS * 1000);
    return false;
  }

  function handleWriteLink(): void {
    setLinkWritten(false);
    if (!allowed()) return;
    const fresh = randomToken();
    setSetupToken(fresh);
    setLog((current) => [...current, ...setupBlock(fresh)]);
    setLinkWritten(true);
  }

  function handleRequestReset(email: string): void {
    if (!allowed()) return;
    // Same answer for every e-mail; only an active admin gets a line in the log
    if (email.trim().toLowerCase() === admin.email.toLowerCase()) {
      const fresh = randomToken();
      setResetTokens({ [admin.email]: fresh });
      setLog((current) => [...current, ...resetBlock(admin.email, fresh)]);
    }
    update({ screen: 'forgot-sent', token: null });
  }

  function handleOpenLink(link: string): boolean {
    const match = /\/(setup|reset)\/([\w-]+)/.exec(link.trim());
    if (!match) return false;
    setLinkWritten(false);
    update({ screen: match[1] === 'setup' ? 'setup-form' : 'reset', token: match[2] ?? null });
    return true;
  }

  return {
    variant,
    screen,
    language,
    mock429,
    log,
    admin,
    resetEmail,
    limitedSeconds,
    limitOver: limitedUntil > 0 && limitedSeconds === 0,
    linkWritten,
    handleScreenChange: (next) => {
      setLinkWritten(false);
      update({ screen: next, token: null });
    },
    handleVariantChange: (next) => update({ variant: next }),
    handleLanguageChange: (next) => update({ lang: next }),
    handleMock429Change: (on) => {
      setLimitedUntil(0);
      update({ mock: on ? '429' : null });
    },
    handleWriteLink,
    handleRequestReset,
    handleOpenLink,
    handleCompleteSetup: (next) => {
      setAdmin(next);
      update({ screen: 'done', token: null });
    },
    handleCompleteReset: () => {
      // A reset link works once
      setResetTokens({});
      update({ screen: 'done', token: null });
    },
  };
}
