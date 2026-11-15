import type { Estimate } from '@dreck/shared/api/estimates';
import { useParams } from 'react-router';
import { type QueryState, useQuery } from '@/api/useQuery';

/** The Estimate of `:estimateId` plus all Estimates; `estimate` is undefined for an unknown id. */
export function useEstimateRoute(): QueryState<{
  estimate: Estimate | undefined;
  estimates: Estimate[];
}> {
  const { estimateId } = useParams();
  // No GET /estimates/:id in the API; the list is small
  const state = useQuery<Estimate[]>('/estimates');
  if (state.status !== 'ready') return state;
  return {
    status: 'ready',
    data: {
      estimate: state.data.find((e) => String(e.id) === estimateId),
      estimates: state.data,
    },
  };
}
