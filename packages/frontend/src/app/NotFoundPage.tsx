import type { ReactElement } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { Page, PageTitle } from '@/ui/Page';

/**
 * Shown for unknown paths.
 * @example <Route path="*" element={<NotFoundPage />} />
 */
export function NotFoundPage(): ReactElement {
  const { messages } = useI18n();
  return (
    <Page>
      <PageTitle>404</PageTitle>
      <p>{messages.shell.notFound}</p>
    </Page>
  );
}
