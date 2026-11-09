import type { ReactElement } from 'react';
import { Outlet } from 'react-router';
import { OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { useI18n } from '@/i18n/useI18n';
import { useSettingsState } from '@/settings/useSettings';
import { OfflineNotice } from '@/ui/OfflineNotice';
import { Page } from '@/ui/Page';

/**
 * The current page once the settings are loaded, the onboarding while there is no Customer;
 * until then "Lädt …" or "Keine Verbindung".
 * @example <main><PageOutlet /></main>
 */
export function PageOutlet(): ReactElement {
  const { messages } = useI18n();
  const state = useSettingsState();

  switch (state.status) {
    case 'ready':
      return (
        <OnboardingGate>
          <Outlet />
        </OnboardingGate>
      );
    case 'offline':
      return (
        <Page>
          <OfflineNotice message={messages.connection.offline} onRetry={state.retry} />
        </Page>
      );
    case 'loading':
      return (
        <Page>
          <p className="text-temp-ink-muted">{messages.shell.loading}</p>
        </Page>
      );
  }
}
