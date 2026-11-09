import { useParams, useSearchParams } from 'react-router';
import type { QueryState } from '@/api/useQuery';
import { type Catalog, useCatalog } from '@/catalog/useCatalog';

type ProjectRoute = {
  catalog: QueryState<Catalog>;
  /** `:projectId` of the route; `undefined` on "new". */
  projectId?: number;
  /** `:customerId` of the route or `?customerId=` for a new Project. */
  customerId?: number;
};

/** Ids from the URL of the project and customer screens plus the catalog. */
export function useProjectRoute(): ProjectRoute {
  const params = useParams();
  const [search] = useSearchParams();
  const toId = (value: string | null | undefined): number | undefined =>
    value ? Number(value) : undefined;
  return {
    catalog: useCatalog(),
    projectId: toId(params.projectId),
    customerId: toId(params.customerId ?? search.get('customerId')),
  };
}
