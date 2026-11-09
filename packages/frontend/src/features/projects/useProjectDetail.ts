import type { Customer } from '@dreck/shared/api/customers';
import type { Expense } from '@dreck/shared/api/expenses';
import type { Project } from '@dreck/shared/api/projects';
import type { Report } from '@dreck/shared/api/reports';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { useParams } from 'react-router';
import { combineQueries, type QueryState, useQuery } from '@/api/useQuery';
import { useCatalog } from '@/catalog/useCatalog';
import { elapsedSeconds, useNow, useToday } from '@/clock/useNow';
import { ALL_TIME, addDays, startOfWeek } from '@/format/calendar';
import { formatDate, formatDateRange } from '@/format/date';
import { useI18n } from '@/i18n/useI18n';
import type { ChartPoint } from '@/ui/WeeklyChart';

const MAX_WEEKS = 26;
const MIN_WEEKS = 12;

export type ProjectDetail = {
  project: Project;
  customer: Customer | undefined;
  totals: Report['totals'];
  entries: TimeEntry[];
  expenses: Expense[];
  weekly: ChartPoint[];
  progress: ChartPoint[];
  now: number;
};

/** Data of the Project screen: sums of all time, weekly hours, Time Entries and Expenses. */
export function useProjectDetail(): { projectId: number; data: QueryState<ProjectDetail | null> } {
  const { language } = useI18n();
  const projectId = Number(useParams().projectId);
  const today = useToday();
  const state = combineQueries(
    useCatalog(),
    useQuery<Report>('/reports', { ...ALL_TIME, projectId }),
    useQuery<TimeEntry[]>('/time-entries', { projectId }),
    useQuery<Expense[]>('/expenses', { projectId }),
  );
  const running = state.status === 'ready' && state.data[2].some((e) => e.runningSince !== null);
  const now = useNow(running, 60_000);

  if (state.status !== 'ready') return { projectId, data: state };
  const [catalog, report, entries, expenses] = state.data;
  const project = catalog.project(projectId);
  if (!project) return { projectId, data: { status: 'ready', data: null } };

  const weeks = weekRange(entries, today);
  const weekly = weeks.map((from, i) => {
    const seconds = entries
      .filter((e) => startOfWeek(e.date) === from)
      .reduce((sum, e) => sum + elapsedSeconds(e, now), 0);
    const startsMonth = i === 0 || from.slice(0, 7) !== weeks[i - 1]?.slice(0, 7);
    return {
      tick: startsMonth ? formatDate(from, language, { month: 'short', year: 'numeric' }) : null,
      label: formatDateRange(from, addDays(from, 6), language),
      value: seconds / 3600,
      current: from === startOfWeek(today),
    };
  });
  // Progress starts with everything before the first shown week
  const before = entries
    .filter((e) => e.date < (weeks[0] ?? today))
    .reduce((sum, e) => sum + elapsedSeconds(e, now), 0);
  let sum = before / 3600;
  const progress = weekly.map((point) => {
    sum += point.value;
    return { ...point, value: sum };
  });

  return {
    projectId,
    data: {
      status: 'ready',
      data: {
        project,
        customer: catalog.customerOf(project),
        totals: report.totals,
        entries,
        expenses,
        weekly,
        progress,
        now,
      },
    },
  };
}

// Mondays from the first Time Entry (at least 12, at most 26 weeks back) to the current week
function weekRange(entries: TimeEntry[], today: string): string[] {
  const current = startOfWeek(today);
  const [first = current] = [current, ...entries.map((e) => e.date)].sort();
  const span = Math.round(
    (Date.parse(current) - Date.parse(startOfWeek(first))) / (7 * 86_400_000),
  );
  const count = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, span + 1));
  return Array.from({ length: count }, (_, i) => addDays(current, (i - count + 1) * 7));
}
