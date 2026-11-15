import type { Estimate } from '@dreck/shared/api/estimates';
import type { ReactElement, ReactNode } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { Page } from '@/ui/Page';
import { QueryView } from '@/ui/QueryView';
import { BackLink } from './BackLink';
import { useEstimateRoute } from './useEstimateRoute';

type EstimatePageProps = {
  /** Renders the Estimate of the URL; gets all Estimates too. */
  children: (estimate: Estimate, estimates: Estimate[]) => ReactNode;
};

/**
 * Page frame for one Estimate: loads it by `:estimateId`, shows "Nicht gefunden" otherwise.
 * @example <EstimatePage>{(estimate) => <EstimateDocument estimate={estimate} />}</EstimatePage>
 */
export function EstimatePage({ children }: EstimatePageProps): ReactElement {
  const { messages } = useI18n();
  return (
    <Page>
      <QueryView state={useEstimateRoute()}>
        {({ estimate, estimates }) =>
          estimate ? (
            children(estimate, estimates)
          ) : (
            <>
              <BackLink />
              <p>{messages.errors.not_found}</p>
            </>
          )
        }
      </QueryView>
    </Page>
  );
}
