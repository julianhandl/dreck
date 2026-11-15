import type { Estimate } from '@dreck/shared/api/estimates';
import type { ReactElement } from 'react';
import { DocumentView } from '@/features/documents/DocumentView';
import { formatDate } from '@/format/date';
import { useI18n } from '@/i18n/useI18n';

type EstimateDocumentProps = {
  /** The Estimate to show and print. */
  estimate: Estimate;
};

/**
 * The Estimate as the Customer gets it: number, estimate date and validity around the shared
 * document. It is the only part of the page that prints.
 * @example <EstimateDocument estimate={estimate} />
 */
export function EstimateDocument({ estimate }: EstimateDocumentProps): ReactElement {
  const { language, messages } = useI18n();
  const t = messages.estimates.document;

  return (
    <DocumentView
      {...estimate}
      title={t.title}
      numberLabel={t.number}
      dates={[
        { label: t.issueDate, value: formatDate(estimate.issueDate, language) },
        ...(estimate.validUntil
          ? [{ label: t.validUntil, value: formatDate(estimate.validUntil, language) }]
          : []),
      ]}
    />
  );
}
