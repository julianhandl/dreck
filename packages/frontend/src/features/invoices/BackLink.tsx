import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/i18n/useI18n';
import { ArrowLeftIcon } from '@/ui/icons';

/**
 * Link back to the list of Invoices.
 * @example <BackLink />
 */
export function BackLink(): ReactElement {
  const { messages } = useI18n();
  return (
    <Link
      to="/invoices"
      className="inline-flex w-fit items-center gap-2 text-temp-link underline underline-offset-2 print:hidden"
    >
      <ArrowLeftIcon />
      {messages.invoices.detail.back}
    </Link>
  );
}
