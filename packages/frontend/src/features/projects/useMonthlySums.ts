import type { Project } from '@dreck/shared/api/projects';
import type { Report } from '@dreck/shared/api/reports';
import type { BudgetSums } from '@dreck/shared/budget';
import { type QueryState, useQuery } from '@/api/useQuery';
import { useToday } from '@/clock/useNow';
import { periodRange } from '@/format/calendar';

const NONE: Map<number, BudgetSums> = new Map();

/**
 * Sums per Project of the current month (in the time zone of the instance) for monthly
 * Budgets; requests the Report only while one of the `projects` has a monthly Budget.
 */
export function useMonthlySums(
  projects: Project[],
  projectId?: number,
): QueryState<Map<number, BudgetSums>> {
  const today = useToday();
  const needed = projects.some((p) => p.budget?.monthly);
  const state = useQuery<Report>('/reports', { ...periodRange('month', today), projectId }, needed);
  if (!needed) return { status: 'ready', data: NONE };
  if (state.status !== 'ready') return state;
  const sums = state.data.customers.flatMap((c) => c.projects).map((p) => [p.id, p] as const);
  return { status: 'ready', data: new Map(sums) };
}
