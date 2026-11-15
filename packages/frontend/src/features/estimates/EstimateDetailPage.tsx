import type { Estimate } from '@dreck/shared/api/estimates';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { formatDate } from '@/format/date';
import { formatMoney } from '@/format/money';
import { FormStatus } from '@/forms/FormStatus';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/settings/useSettings';
import { ActionsMenu, type MenuAction } from '@/ui/ActionsMenu';
import { Button } from '@/ui/Button';
import { PageTitle } from '@/ui/Page';
import { BackLink } from './BackLink';
import { EstimateDocument } from './EstimateDocument';
import { EstimatePage } from './EstimatePage';
import { EstimateStatusPill } from './EstimateStatusPill';
import { displayStatus } from './estimate-display';
import { type EstimateCommand, useEstimateDetail } from './useEstimateDetail';

/**
 * One Estimate: status, total and validity, the status actions and print, below the document
 * as the Customer gets it. Only the document prints.
 * @example <Route path="estimates/:estimateId" element={<EstimateDetailPage />} />
 */
export function EstimateDetailPage(): ReactElement {
  return <EstimatePage>{(estimate) => <EstimateDetailContent estimate={estimate} />}</EstimatePage>;
}

type EstimateDetailContentProps = {
  /** The Estimate of the URL. */
  estimate: Estimate;
};

function EstimateDetailContent({ estimate }: EstimateDetailContentProps): ReactElement {
  const { language, messages } = useI18n();
  const { currency } = useSettings();
  const detail = useEstimateDetail(estimate);
  const { submit } = detail;
  const t = messages.estimates.detail;
  const a = messages.estimates.actions;
  const { status } = estimate;

  const action = (label: string, command: EstimateCommand, danger?: boolean): MenuAction => ({
    label,
    danger,
    onSelect: () => submit.handleSubmit(command),
  });
  const button = (label: string, command: EstimateCommand): ReactElement => (
    <Button aria-disabled={submit.pending} onClick={() => submit.handleSubmit(command)}>
      {label}
    </Button>
  );

  const menu: MenuAction[] = [];
  if (status === 'sent') menu.push(action(a.backToDraft, 'backToDraft'));
  if (status === 'accepted' || status === 'declined') {
    menu.push(action(a.backToSent, 'backToSent'), action(a.backToDraft, 'backToDraft'));
  }
  if (status !== 'accepted') menu.push(action(a.createInvoice, 'createInvoice'));
  menu.push(action(messages.common.delete, 'delete', true));

  return (
    <>
      <div className="flex flex-col gap-4 print:hidden">
        <BackLink />
        <div className="flex flex-wrap items-center gap-4">
          <PageTitle>{t.title(estimate.number)}</PageTitle>
          <EstimateStatusPill status={displayStatus(estimate, detail.today)} />
          <p className="text-lg sm:ml-auto">
            {t.summaryTotal(formatMoney(estimate.totalMinor, currency, language))}
          </p>
        </div>
        {estimate.validUntil && (
          <p className="text-temp-ink-muted">
            {t.validUntil(formatDate(estimate.validUntil, language))}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {status === 'draft' && (
            <>
              <Button as={Link} to={`/estimates/${estimate.id}/edit`} variant="primary">
                {t.edit}
              </Button>
              {button(a.markSent, 'markSent')}
            </>
          )}
          {status === 'sent' && (
            <>
              {button(a.accept, 'accept')}
              {button(a.decline, 'decline')}
            </>
          )}
          {status === 'accepted' && button(a.createInvoice, 'createInvoice')}
          <Button onClick={detail.handlePrint}>{t.print}</Button>
          <ActionsMenu
            label={messages.common.actions}
            ariaLabel={messages.common.actionsFor(t.title(estimate.number))}
            actions={menu}
          />
        </div>
        {status !== 'draft' && <p className="text-temp-ink-muted">{t.locked}</p>}
        <FormStatus submit={submit} />
      </div>
      <EstimateDocument estimate={estimate} />
    </>
  );
}
