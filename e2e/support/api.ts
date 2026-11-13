import { type APIRequestContext, expect } from '@playwright/test';

const API = '/api/v1';

/** The part of a created Customer, Project or Time Entry the tests need. */
type Created = { id: number };

/** Name that is unique across runs against the same database and across projects. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function send<T>(
  request: APIRequestContext,
  method: 'post' | 'patch',
  path: string,
  data: unknown,
): Promise<T> {
  const response = await request[method](`${API}${path}`, { data });
  expect(response.ok(), `${method.toUpperCase()} ${path}: ${await response.text()}`).toBe(true);
  return (await response.json()) as T;
}

/** Creates a Customer; `hourlyRateMinor` in cents. */
export function createCustomer(
  request: APIRequestContext,
  name: string,
  hourlyRateMinor: number,
): Promise<Created> {
  return send(request, 'post', '/customers', { name, hourlyRateMinor });
}

/** Creates a Project; without `hourlyRateMinor` it takes over the rate of its Customer. */
export function createProject(
  request: APIRequestContext,
  customerId: number,
  name: string,
  hourlyRateMinor?: number,
): Promise<Created> {
  return send(request, 'post', '/projects', { customerId, name, hourlyRateMinor });
}

/** Creates a Time Entry of `hours` hours on `date` (`YYYY-MM-DD`). */
export function createTimeEntry(
  request: APIRequestContext,
  projectId: number,
  date: string,
  hours: number,
  description?: string,
): Promise<Created> {
  return send(request, 'post', '/time-entries', {
    projectId,
    date,
    durationSeconds: hours * 3600,
    description,
  });
}

/** Creates an Expense, Billable unless `billable` is false; `amountMinor` in cents. */
export function createExpense(
  request: APIRequestContext,
  projectId: number,
  date: string,
  amountMinor: number,
  description: string,
  billable = true,
): Promise<Created> {
  return send(request, 'post', '/expenses', {
    projectId,
    date,
    amountMinor,
    description,
    billable,
  });
}

/** Corrects the Hourly Rate of a Time Entry by hand (`hourlyRateOverridden`). */
export function overrideRate(
  request: APIRequestContext,
  timeEntryId: number,
  hourlyRateMinor: number,
): Promise<Created> {
  return send(request, 'patch', `/time-entries/${timeEntryId}`, { hourlyRateMinor });
}

/** Starts a new timer on a Project as if clicked at `at`, e.g. hours ago for a forgotten one. */
export async function startTimer(
  request: APIRequestContext,
  projectId: number,
  at: Date,
): Promise<Created> {
  const result = await send<{ started: Created }>(request, 'post', '/timer/start', {
    projectId,
    at: at.toISOString(),
  });
  return result.started;
}

/** All Time Entries, e.g. to check a duration the screen only shows in minutes. */
export async function listTimeEntries(request: APIRequestContext): Promise<
  {
    id: number;
    durationSeconds: number;
    runningSince: string | null;
    invoiceItemId: number | null;
  }[]
> {
  const response = await request.get(`${API}/time-entries`);
  expect(response.ok()).toBe(true);
  return response.json();
}
