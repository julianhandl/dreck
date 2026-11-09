import type { Customer } from '@dreck/shared/api/customers';
import type { Project } from '@dreck/shared/api/projects';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';

export type CustomerGroup = { customer: Customer; projects: Project[] };

/** Customers and Projects with lookups; both lists come sorted by name from the API. */
export type Catalog = {
  customers: Customer[];
  projects: Project[];
  customerOf: (project: Project) => Customer | undefined;
  project: (id: number) => Project | undefined;
  /** Every Customer with its Projects, Archived included. */
  groups: CustomerGroup[];
  /** Projects that can be picked: neither they nor their Customer are Archived. */
  selectable: CustomerGroup[];
};

/** Loads Customers and Projects, e.g. for pickers and names in lists. */
export function useCatalog(): QueryState<Catalog> {
  const state = combineQueries(
    useQuery<Customer[]>('/customers'),
    useQuery<Project[]>('/projects'),
  );
  if (state.status !== 'ready') return state;
  const [customers, projects] = state.data;
  return { status: 'ready', data: buildCatalog(customers, projects) };
}

/** Lookups and groupings over the two lists. */
export function buildCatalog(customers: Customer[], projects: Project[]): Catalog {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const groups = customers.map((customer) => ({
    customer,
    projects: projects.filter((p) => p.customerId === customer.id),
  }));
  const selectable = groups
    .filter((group) => !group.customer.archived)
    .map((group) => ({ ...group, projects: group.projects.filter((p) => !p.archived) }))
    .filter((group) => group.projects.length > 0);

  return {
    customers,
    projects,
    customerOf: (project) => customerById.get(project.customerId),
    project: (id) => projectById.get(id),
    groups,
    selectable,
  };
}
