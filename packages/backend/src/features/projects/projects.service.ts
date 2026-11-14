import type { Project as ProjectResponse } from '@dreck/shared/api/projects';
import { type TaskInput, taskRateMinor } from '@dreck/shared/api/tasks';
import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { customers } from '@/features/customers/customers.table';
import {
  deleteTasksOfProject,
  listDefaultTasks,
  replaceTasks,
  tasksByProject,
} from '@/features/tasks/tasks.service';
import { tasks } from '@/features/tasks/tasks.table';
import { timeEntries } from '@/features/time-entries/time-entries.table';
import { ApiError, fieldError } from '@/http/api-error';
import { type Project, projects } from './projects.table';

/** Which existing Time Entries take over a new Hourly Rate (`from`/`to` inclusive, empty = all). */
export type ApplyToTimeEntries = { from?: string; to?: string; includeOverridden?: boolean };

/** Hourly Rate of new Time Entries per Task id of a Project; key `null` = without Task. */
export type ProjectRates = Map<number | null, number>;

type ProjectInput = {
  customerId: number;
  name: string;
  hourlyRateMinor?: number;
  tasks?: TaskInput[];
};

type ProjectChanges = Partial<Omit<Project, 'id'>> & {
  tasks?: TaskInput[];
  applyToTimeEntries?: ApplyToTimeEntries;
};

/** All Projects including Archived with their Tasks, sorted by name. */
export function listProjects(db: Db): ProjectResponse[] {
  const rows = db
    .select()
    .from(projects)
    .orderBy(sql`${projects.name} COLLATE NOCASE`, projects.id)
    .all();
  const byProject = tasksByProject(
    db,
    rows.map((p) => p.id),
  );
  return rows.map((p) => ({ ...p, tasks: byProject.get(p.id) ?? [] }));
}

/** Project referenced in a request body; a missing one fails validation at `projectId`. */
export function requireProject(db: Db, id: number): Project {
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) throw fieldError('projectId', 'Project not found');
  return project;
}

/**
 * Creates a Project; without a rate it copies the Hourly Rate of its Customer, without Tasks
 * the Default Tasks.
 */
export function createProject(db: Db, { tasks: list, ...input }: ProjectInput): ProjectResponse {
  return db.transaction((tx) => {
    const customer = tx.select().from(customers).where(eq(customers.id, input.customerId)).get();
    if (!customer) throw fieldError('customerId', 'Customer not found');
    const project = tx
      .insert(projects)
      .values({ ...input, hourlyRateMinor: input.hourlyRateMinor ?? customer.hourlyRateMinor })
      .returning()
      .get();
    replaceTasks(tx, project.id, list ?? listDefaultTasks(tx));
    return withTasks(tx, project);
  });
}

/**
 * Changes a Project and its Tasks; optionally the Time Entries whose rate (of the Project or of
 * their Task) changed take it over, in one transaction.
 */
export function updateProject(
  db: Db,
  id: number,
  { applyToTimeEntries, tasks: list, ...changes }: ProjectChanges,
): ProjectResponse {
  return db.transaction((tx) => {
    if (changes.customerId !== undefined) {
      const customer = tx
        .select()
        .from(customers)
        .where(eq(customers.id, changes.customerId))
        .get();
      if (!customer) throw fieldError('customerId', 'Customer not found');
    }
    const before = projectRates(tx, id);
    const project =
      Object.keys(changes).length > 0
        ? tx.update(projects).set(changes).where(eq(projects.id, id)).returning().get()
        : tx.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) throw new ApiError('not_found', 'Project not found');
    if (list) replaceTasks(tx, id, list);
    if (applyToTimeEntries) applyChangedRates(tx, id, before, applyToTimeEntries);
    return withTasks(tx, project);
  });
}

/** Rates new Time Entries of the Project get, per Task. */
export function projectRates(db: Db, projectId: number): ProjectRates {
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return new Map();
  const rates: ProjectRates = new Map([[null, project.hourlyRateMinor]]);
  for (const task of db.select().from(tasks).where(eq(tasks.projectId, projectId)).all()) {
    rates.set(task.id, taskRateMinor(task, project));
  }
  return rates;
}

/**
 * Sets the current rate on the Project's Time Entries in the range whose rate changed since
 * `before`. Entries corrected by hand stay untouched unless `includeOverridden`; afterwards no
 * entry counts as corrected. Invoiced entries never change.
 */
export function applyChangedRates(
  db: Db,
  projectId: number,
  before: ProjectRates,
  { from, to, includeOverridden }: ApplyToTimeEntries,
): void {
  for (const [taskId, hourlyRateMinor] of projectRates(db, projectId)) {
    // A new Task has no Time Entries yet
    if (!before.has(taskId) || before.get(taskId) === hourlyRateMinor) continue;
    db.update(timeEntries)
      .set({ hourlyRateMinor, hourlyRateOverridden: false })
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          taskId === null ? isNull(timeEntries.taskId) : eq(timeEntries.taskId, taskId),
          from ? gte(timeEntries.date, from) : undefined,
          to ? lte(timeEntries.date, to) : undefined,
          includeOverridden ? undefined : eq(timeEntries.hourlyRateOverridden, false),
          isNull(timeEntries.invoiceItemId),
        ),
      )
      .run();
  }
}

/** Deletes a Project without Time Entries or Expenses, with its Tasks; otherwise `409 has_dependencies`. */
export function deleteProject(db: Db, id: number): void {
  db.transaction((tx) => {
    deleteTasksOfProject(tx, id);
    const deleted = tx.delete(projects).where(eq(projects.id, id)).returning().get();
    if (!deleted) throw new ApiError('not_found', 'Project not found');
  });
}

function withTasks(db: Db, project: Project): ProjectResponse {
  return { ...project, tasks: tasksByProject(db, [project.id]).get(project.id) ?? [] };
}
