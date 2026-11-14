import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '@/db/db';
import {
  type ApplyToTimeEntries,
  applyChangedRates,
  projectRates,
} from '@/features/projects/projects.service';
import { projects } from '@/features/projects/projects.table';
import { getSettings } from '@/features/settings/settings.service';
import { ApiError, fieldError } from '@/http/api-error';
import { type Customer, customers } from './customers.table';

type CustomerInput = { name: string; hourlyRateMinor?: number; address?: string | null };

type CustomerChanges = Partial<Omit<Customer, 'id'>> & {
  applyToProjects?: { projectIds: number[]; applyToTimeEntries?: ApplyToTimeEntries };
};

/** All Customers including Archived, sorted by name. */
export function listCustomers(db: Db): Customer[] {
  return db
    .select()
    .from(customers)
    .orderBy(sql`${customers.name} COLLATE NOCASE`, customers.id)
    .all();
}

/** Creates a Customer; without a rate it copies the Default Hourly Rate. */
export function createCustomer(db: Db, input: CustomerInput): Customer {
  const hourlyRateMinor = input.hourlyRateMinor ?? getSettings(db).defaultHourlyRateMinor;
  return db
    .insert(customers)
    .values({ ...input, hourlyRateMinor, address: input.address || null })
    .returning()
    .get();
}

/**
 * Changes a Customer. With `applyToProjects` the chosen Projects take over the new Hourly Rate;
 * with `applyToTimeEntries` the Project rule applies to their Time Entries, in one shared range.
 * All in one transaction.
 */
export function updateCustomer(
  db: Db,
  id: number,
  { applyToProjects, ...changes }: CustomerChanges,
): Customer {
  if (changes.address !== undefined) changes.address = changes.address || null;
  return db.transaction((tx) => {
    const customer =
      Object.keys(changes).length > 0
        ? tx.update(customers).set(changes).where(eq(customers.id, id)).returning().get()
        : tx.select().from(customers).where(eq(customers.id, id)).get();
    if (!customer) throw new ApiError('not_found', 'Customer not found');

    const rate = changes.hourlyRateMinor;
    if (applyToProjects && rate !== undefined) {
      for (const projectId of applyToProjects.projectIds) {
        const before = projectRates(tx, projectId);
        const project = tx
          .update(projects)
          .set({ hourlyRateMinor: rate })
          .where(and(eq(projects.id, projectId), eq(projects.customerId, id)))
          .returning()
          .get();
        if (!project) {
          throw fieldError(
            'applyToProjects',
            `Project ${projectId} does not belong to this customer`,
          );
        }
        const { applyToTimeEntries } = applyToProjects;
        // Tasks with an own rate keep it, so their Time Entries stay too
        if (applyToTimeEntries) applyChangedRates(tx, projectId, before, applyToTimeEntries);
      }
    }
    return customer;
  });
}

/** Deletes a Customer without Projects; otherwise `409 has_dependencies`. */
export function deleteCustomer(db: Db, id: number): void {
  const deleted = db.delete(customers).where(eq(customers.id, id)).returning().get();
  if (!deleted) throw new ApiError('not_found', 'Customer not found');
}
