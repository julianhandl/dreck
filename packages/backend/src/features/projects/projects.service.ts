import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { customers } from '@/features/customers/customers.table';
import { timeEntries } from '@/features/time-entries/time-entries.table';
import { ApiError, fieldError } from '@/http/api-error';
import { type Project, projects } from './projects.table';

/** Which existing Time Entries take over a new Hourly Rate (`from`/`to` inclusive, empty = all). */
export type ApplyToTimeEntries = { from?: string; to?: string; includeOverridden?: boolean };

type ProjectInput = { customerId: number; name: string; hourlyRateMinor?: number };

type ProjectChanges = Partial<Omit<Project, 'id'>> & { applyToTimeEntries?: ApplyToTimeEntries };

/** All Projects including Archived, sorted by name. */
export function listProjects(db: Db): Project[] {
  return db
    .select()
    .from(projects)
    .orderBy(sql`${projects.name} COLLATE NOCASE`, projects.id)
    .all();
}

/** Project referenced in a request body; a missing one fails validation at `projectId`. */
export function requireProject(db: Db, id: number): Project {
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) throw fieldError('projectId', 'Project not found');
  return project;
}

/** Creates a Project; without a rate it copies the Hourly Rate of its Customer. */
export function createProject(db: Db, input: ProjectInput): Project {
  const customer = db.select().from(customers).where(eq(customers.id, input.customerId)).get();
  if (!customer) throw fieldError('customerId', 'Customer not found');
  return db
    .insert(projects)
    .values({ ...input, hourlyRateMinor: input.hourlyRateMinor ?? customer.hourlyRateMinor })
    .returning()
    .get();
}

/** Changes a Project and optionally applies a new Hourly Rate to its Time Entries, in one transaction. */
export function updateProject(
  db: Db,
  id: number,
  { applyToTimeEntries, ...changes }: ProjectChanges,
): Project {
  return db.transaction((tx) => {
    if (changes.customerId !== undefined) {
      const customer = tx
        .select()
        .from(customers)
        .where(eq(customers.id, changes.customerId))
        .get();
      if (!customer) throw fieldError('customerId', 'Customer not found');
    }
    const project =
      Object.keys(changes).length > 0
        ? tx.update(projects).set(changes).where(eq(projects.id, id)).returning().get()
        : tx.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) throw new ApiError('not_found', 'Project not found');
    if (applyToTimeEntries && changes.hourlyRateMinor !== undefined) {
      applyRateToTimeEntries(tx, id, changes.hourlyRateMinor, applyToTimeEntries);
    }
    return project;
  });
}

/**
 * Sets the Hourly Rate on the Project's Time Entries in the range. Entries corrected by hand stay
 * untouched unless `includeOverridden`; afterwards no entry counts as corrected. Invoiced entries
 * never change.
 */
export function applyRateToTimeEntries(
  db: Db,
  projectId: number,
  hourlyRateMinor: number,
  { from, to, includeOverridden }: ApplyToTimeEntries,
): void {
  db.update(timeEntries)
    .set({ hourlyRateMinor, hourlyRateOverridden: false })
    .where(
      and(
        eq(timeEntries.projectId, projectId),
        from ? gte(timeEntries.date, from) : undefined,
        to ? lte(timeEntries.date, to) : undefined,
        includeOverridden ? undefined : eq(timeEntries.hourlyRateOverridden, false),
        isNull(timeEntries.invoiceItemId),
      ),
    )
    .run();
}

/** Deletes a Project without Time Entries or Expenses; otherwise `409 has_dependencies`. */
export function deleteProject(db: Db, id: number): void {
  const deleted = db.delete(projects).where(eq(projects.id, id)).returning().get();
  if (!deleted) throw new ApiError('not_found', 'Project not found');
}
