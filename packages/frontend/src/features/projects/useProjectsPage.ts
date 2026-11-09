import type { Project } from '@dreck/shared/api/projects';
import type { Report } from '@dreck/shared/api/reports';
import { useState } from 'react';
import { api } from '@/api/api-client';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import { type Catalog, type CustomerGroup, useCatalog } from '@/catalog/useCatalog';
import { ALL_TIME } from '@/format/calendar';
import { type Submit, useSubmit } from '@/forms/useSubmit';

export const STATUS_FILTERS = ['active', 'archived', 'all'] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

export type ProjectSums = Report['customers'][number]['projects'][number];

type Command = { kind: 'archive' | 'restore' | 'delete'; project: Project };

export type ProjectsPage = {
  data: QueryState<{
    catalog: Catalog;
    groups: CustomerGroup[];
    counts: Record<StatusFilter, number>;
  }>;
  /** Sums of all time per Project. */
  sums: (projectId: number) => ProjectSums | undefined;
  search: string;
  status: StatusFilter;
  /** `all` or the id of a Customer. */
  customerFilter: string;
  action: Submit<Command>;
  handleSearchChange: (value: string) => void;
  handleStatusChange: (value: StatusFilter) => void;
  handleCustomerFilterChange: (value: string) => void;
};

/** State of the Projects screen: Customers with their Projects, filters and row actions. */
export function useProjectsPage(): ProjectsPage {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [customerFilter, setCustomerFilter] = useState('all');
  const state = combineQueries(useCatalog(), useQuery<Report>('/reports', { ...ALL_TIME }));

  const action = useSubmit(async ({ kind, project }: Command) => {
    if (kind === 'delete') await api.delete(`/projects/${project.id}`);
    else await api.patch(`/projects/${project.id}`, { archived: kind === 'archive' });
  });

  if (state.status !== 'ready') {
    return {
      data: state,
      sums: () => undefined,
      search,
      status,
      customerFilter,
      action,
      ...handlers(),
    };
  }
  const [catalog, report] = state.data;
  const sums = new Map(report.customers.flatMap((c) => c.projects).map((p) => [p.id, p]));
  const counts = {
    active: catalog.projects.filter((p) => matchesStatus(catalog, p, 'active')).length,
    archived: catalog.projects.filter((p) => matchesStatus(catalog, p, 'archived')).length,
    all: catalog.projects.length,
  };

  const query = search.trim().toLocaleLowerCase();
  const groups = catalog.groups
    .filter((g) => customerFilter === 'all' || String(g.customer.id) === customerFilter)
    .map((g) => {
      const customerHit = g.customer.name.toLocaleLowerCase().includes(query);
      const projects = g.projects.filter(
        (p) =>
          matchesStatus(catalog, p, status) &&
          (customerHit || p.name.toLocaleLowerCase().includes(query)),
      );
      return { ...g, projects };
    })
    // Customers without Projects stay visible so they can get one, unless filters hide them
    .filter(
      (g) =>
        g.projects.length > 0 ||
        (query === '' && (status === 'all' || g.customer.archived === (status === 'archived'))),
    );

  return {
    data: { status: 'ready', data: { catalog, groups, counts } },
    sums: (id) => sums.get(id),
    search,
    status,
    customerFilter,
    action,
    ...handlers(),
  };

  function handlers(): Pick<
    ProjectsPage,
    'handleSearchChange' | 'handleStatusChange' | 'handleCustomerFilterChange'
  > {
    return {
      handleSearchChange: setSearch,
      handleStatusChange: setStatus,
      handleCustomerFilterChange: setCustomerFilter,
    };
  }
}

function matchesStatus(catalog: Catalog, project: Project, status: StatusFilter): boolean {
  if (status === 'all') return true;
  const archived = project.archived || (catalog.customerOf(project)?.archived ?? false);
  return archived === (status === 'archived');
}
