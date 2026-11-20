// PROTOTYPE (branch prototype/setup-recovery-page, ticket 09): three variants of the setup
// page, the setup form behind /setup/<token>, "Passwort vergessen?" and the reset page,
// switchable via ?variant=A|B|C|D and ?screen=…, on /prototype/setup-recovery. In-memory only.
import { LANGUAGES, messages } from '@dreck/shared/i18n';
import type { ReactElement } from 'react';
import { I18nContext } from '@/i18n/i18n-context';
import { PrototypeSwitcher } from '@/ui/PrototypeSwitcher';
import { LogPreview } from './LogPreview';
import { useLogPanel } from './useLogPanel';
import {
  SCREENS,
  type Screen,
  useSetupRecoveryPrototype,
  VARIANTS,
} from './useSetupRecoveryPrototype';
import { VariantA } from './VariantA';
import { VariantB } from './VariantB';
import { VariantC } from './VariantC';
import { VariantD } from './VariantD';

const SCREEN_LABELS: Record<Screen, string> = {
  setup: 'Setup-Seite',
  'setup-form': 'Formular /setup/<token>',
  'setup-expired': 'Setup-Link ungültig',
  done: 'Fertig',
  login: 'Login-Dialog',
  forgot: 'Passwort vergessen?',
  'forgot-sent': 'Antwort nach Anfrage',
  reset: 'Seite hinter Reset-Link',
  'reset-expired': 'Reset-Link abgelaufen',
};

const CONTROL = 'min-h-9 rounded-lg bg-white/10 px-2 text-white';

/**
 * PROTOTYPE: hosts the variants, the simulated container log and the floating switcher.
 * @example <Route path="prototype/setup-recovery" element={<SetupRecoveryPrototype />} />
 */
export function SetupRecoveryPrototype(): ReactElement {
  const p = useSetupRecoveryPrototype();
  const panel = useLogPanel(p.log.length);
  const i18n = { language: p.language, messages: messages[p.language] };

  return (
    <I18nContext value={i18n}>
      <div lang={p.language} className="min-h-dvh">
        {p.variant === 'A' && <VariantA p={p} />}
        {p.variant === 'B' && <VariantB p={p} />}
        {p.variant === 'C' && <VariantC p={p} />}
        {p.variant === 'D' && <VariantD p={p} />}
      </div>

      {panel.open && (
        <section
          aria-label="Container-Log (simuliert)"
          className="fixed inset-x-2 bottom-28 z-30 mx-auto max-w-3xl rounded-2xl bg-black p-3 text-white shadow-temp-float ring-2 ring-fuchsia-500 sm:bottom-20"
        >
          <p className="mb-2 text-sm">
            Container-Log (simuliert). So sähe <code>docker logs dreck</code> aus. Links sind
            klickbar. Admin für „Passwort vergessen?“: julia.beispiel@example.com oder die E-Mail
            aus dem Setup.
          </p>
          <LogPreview
            lines={p.log}
            label="Container-Log"
            onOpenLink={(link) => {
              p.handleOpenLink(link);
              panel.handleClose();
            }}
          />
        </section>
      )}

      <PrototypeSwitcher variants={VARIANTS} current={p.variant} onChange={p.handleVariantChange}>
        <label className="flex items-center gap-1">
          <span className="sr-only">Zustand</span>
          <select
            name="screen"
            value={p.screen}
            onChange={(event) => {
              const next = SCREENS.find((s) => s === event.target.value);
              if (next) p.handleScreenChange(next);
            }}
            className={CONTROL}
          >
            {SCREENS.map((screen) => (
              <option key={screen} value={screen} className="text-black">
                {SCREEN_LABELS[screen]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex rounded-lg bg-white/10 p-0.5">
          <legend className="sr-only">Sprache</legend>
          {LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              aria-pressed={p.language === language}
              onClick={() => p.handleLanguageChange(language)}
              className="min-h-8 rounded-md px-2 uppercase aria-pressed:bg-white aria-pressed:text-black"
            >
              {language}
            </button>
          ))}
        </fieldset>
        <label className="flex min-h-9 items-center gap-1.5">
          <input
            name="mock429"
            type="checkbox"
            checked={p.mock429}
            onChange={(event) => p.handleMock429Change(event.target.checked)}
          />
          429
        </label>
        <button
          type="button"
          aria-expanded={panel.open}
          onClick={panel.handleToggle}
          className={CONTROL}
        >
          Log ({p.log.length})
        </button>
      </PrototypeSwitcher>
    </I18nContext>
  );
}
