// PROTOTYPE (ticket 08): Three variants of the Settings tab „Team", switchable via `?variant=`,
// on the throwaway route /settings/team-prototype; `?as=manager` shows the Manager's view.
import type { ReactElement } from 'react';
import { SettingsNav } from '@/features/settings/SettingsNav';
import { useI18n } from '@/i18n/useI18n';
import { Page, PageTitle } from '@/ui/Page';
import { PrototypeSwitcher } from '@/ui/PrototypeSwitcher';
import type { PrototypeVariant } from '@/ui/usePrototypeSwitcher';
import { ConfirmDialogs } from './TeamPrototypeParts';
import type { Viewer } from './team-prototype-data';
import { useTeamPrototype } from './useTeamPrototype';
import { VariantA } from './VariantA';
import { VariantB } from './VariantB';
import { VariantC } from './VariantC';

const VARIANTS: PrototypeVariant[] = [
  { key: 'A', name: 'Tabelle + Dialoge' },
  { key: 'B', name: 'Liste + Detail' },
  { key: 'C', name: 'Alles auf einer Seite' },
];

const VIEWERS: { value: Viewer; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
];

/**
 * Throwaway Settings tab „Team" with in-memory data and a floating variant switcher.
 * @example <Route path="settings/team-prototype" element={<TeamPrototypePage />} />
 */
export function TeamPrototypePage(): ReactElement {
  const { messages } = useI18n();
  const team = useTeamPrototype();
  const { variant } = team;

  return (
    <Page>
      <PageTitle>{messages.nav.settings}</PageTitle>
      <SettingsNav />
      {variant === 'B' ? (
        <VariantB team={team} />
      ) : variant === 'C' ? (
        <VariantC team={team} />
      ) : (
        <VariantA team={team} />
      )}
      <ConfirmDialogs team={team} />
      {/* Room for the floating bar at the end of the page */}
      <div aria-hidden="true" className="h-16" />
      <PrototypeSwitcher variants={VARIANTS}>
        <span className="flex items-center gap-1 border-temp-ink-muted border-l pl-2">
          <span className="px-1 text-sm">Ansicht als</span>
          {VIEWERS.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={team.viewer === v.value}
              onClick={() => team.handleViewerChange(v.value)}
              className="min-h-9 rounded-temp-pill px-3 text-sm aria-pressed:bg-temp-canvas aria-pressed:text-temp-ink"
            >
              {v.label}
            </button>
          ))}
        </span>
      </PrototypeSwitcher>
    </Page>
  );
}
