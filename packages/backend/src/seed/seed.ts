import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { Customer } from '@dreck/shared/api/customers';
import type { Invoice } from '@dreck/shared/api/invoices';
import type { Project } from '@dreck/shared/api/projects';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { dateInTimeZone } from '@dreck/shared/time';
import { createApp } from '@/app';
import { openDatabase } from '@/db/db';
import { runMigrations } from '@/db/migrations/run-migrations';
import { loadSecret } from '@/features/auth/secret/load-secret';
import {
  CUSTOMERS,
  DAYS_OF_HISTORY,
  EXPENSES,
  HOLIDAYS,
  INVOICES,
  MONTHLY_EXPENSES,
  PAYMENT_TERM_DAYS,
  RATE_CHANGES,
  SETTINGS,
  SPECIAL_ENTRIES,
  TIMEZONE,
  VACATIONS,
} from './seed-data';

/**
 * Fills a fresh data dir with a year of test data through the real API, so all invariants
 * (rate copying, invoice import, locking) hold. Same seed, same data relative to today.
 *
 * bun run src/seed/seed.ts --data-dir .data-seed
 */

const MIGRATIONS_DIR = join(import.meta.dir, '..', '..', 'drizzle');
const RANDOM_SEED = 20261113;

type SeedProject = Project & { weight: number; descriptions: readonly string[]; internal: boolean };
type Call = <T>(method: string, path: string, body?: unknown) => Promise<T>;

const { values } = parseArgs({
  options: { 'data-dir': { type: 'string', default: '.data-seed' } },
});
const dataDir = resolve(values['data-dir']);

try {
  await seed(dataDir);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

async function seed(dir: string): Promise<void> {
  const dbFile = join(dir, 'dreck.db');
  if (await Bun.file(dbFile).exists()) {
    throw new Error(`${dbFile} already exists. Seed only fills a new data dir; remove it first.`);
  }
  await mkdir(dir, { recursive: true });
  const { secret, generated } = await loadSecret(
    { secret: process.env.DRECK_SECRET || undefined },
    dir,
  );
  const db = openDatabase(dbFile);
  await runMigrations(db, { migrationsFolder: MIGRATIONS_DIR });
  const call = apiClient(createApp({ db, secret, dataDir: dir }), secret);

  const today = dateInTimeZone(Date.now(), TIMEZONE);
  const daysAgo = (days: number): string => addDays(today, -days);
  const random = mulberry32(RANDOM_SEED);

  await call('PATCH', '/settings', SETTINGS);

  const customers = new Map<string, Customer>();
  const projects = new Map<string, SeedProject>();
  for (const { projects: projectSeeds, archived: _, internal = false, ...input } of CUSTOMERS) {
    const customer = await call<Customer>('POST', '/customers', input);
    customers.set(customer.name, customer);
    for (const { key, name, hourlyRateMinor, weight, descriptions } of projectSeeds) {
      const project = await call<Project>('POST', '/projects', {
        customerId: customer.id,
        name,
        hourlyRateMinor,
      });
      projects.set(key, { ...project, weight, descriptions, internal });
    }
  }
  const projectSeed = (key: string): SeedProject => required(projects.get(key), key);
  const customerId = (name: string): number => required(customers.get(name), name).id;
  const activeOn = (ago: number): SeedProject[] =>
    CUSTOMERS.flatMap((c) => c.projects)
      .filter((p) => p.from >= ago && p.to <= ago)
      .map((p) => projectSeed(p.key));

  // Time Entries, day by day so rate changes only reach later entries
  let timeEntryCount = 0;
  const book = async (project: SeedProject, date: string, minutes: number): Promise<number> => {
    const description = random() < 0.1 ? undefined : pick(random, project.descriptions);
    // Mostly billable Tasks; a few entries without Task
    const tasks = project.tasks.filter((t) => t.billable || random() < 0.2);
    const task = random() < 0.15 || tasks.length === 0 ? undefined : pick(random, tasks);
    const entry = await call<TimeEntry>('POST', '/time-entries', {
      projectId: project.id,
      taskId: task?.id,
      date,
      durationSeconds: durationSeconds(random, minutes),
      description,
    });
    timeEntryCount += 1;
    return entry.id;
  };

  for (let ago = DAYS_OF_HISTORY; ago >= 0; ago -= 1) {
    for (const change of RATE_CHANGES.filter((c) => c.daysAgo === ago)) {
      await call('PATCH', `/customers/${customerId(change.customer)}`, {
        hourlyRateMinor: change.hourlyRateMinor,
        applyToProjects: { projectIds: change.projects.map((key) => projectSeed(key).id) },
      });
    }

    const date = daysAgo(ago);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const active = activeOn(ago);
    const billable = active.filter((p) => !p.internal);

    if (weekday === 6) {
      // Rare weekend incident at the server customer
      const ops = billable.find((p) => p.name === 'Betrieb & Monitoring');
      if (ops && random() < 0.06) await book(ops, date, randomInt(random, 30, 120));
      continue;
    }
    if (weekday === 0 || isDayOff(date.slice(5)) || random() < 0.025) continue;

    let budget = ago === 0 ? randomInt(random, 90, 180) : randomInt(random, 330, 480);
    for (const light of billable.filter((p) => p.weight < 1)) {
      if (random() >= light.weight * 0.25) continue;
      const minutes = randomInt(random, 15, 90);
      await book(light, date, minutes);
      budget -= minutes;
    }

    const main = billable.filter((p) => p.weight >= 1);
    const count = Math.min(main.length, 1 + Number(random() < 0.5) + Number(random() < 0.15));
    const picked = pickWeighted(random, main, count);
    const shares = picked.map(() => 0.5 + random());
    const total = shares.reduce((a, b) => a + b, 0);
    for (const [i, project] of picked.entries()) {
      await book(project, date, Math.max(15, (budget * (shares[i] ?? 1)) / total));
    }

    for (const internal of active.filter((p) => p.internal)) {
      if (random() >= internal.weight) continue;
      await book(
        internal,
        date,
        internal.weight < 0.1 ? randomInt(random, 120, 240) : randomInt(random, 20, 90),
      );
    }
  }

  for (const special of SPECIAL_ENTRIES) {
    const entry = await call<TimeEntry>('POST', '/time-entries', {
      projectId: projectSeed(special.project).id,
      date: daysAgo(special.daysAgo),
      durationSeconds: special.durationSeconds,
      description: special.description,
    });
    await call('PATCH', `/time-entries/${entry.id}`, { hourlyRateMinor: special.hourlyRateMinor });
    timeEntryCount += 1;
  }

  // Expenses
  const monthly = MONTHLY_EXPENSES.flatMap(({ dayOfMonth, from, to, ...expense }) =>
    monthDays(daysAgo(from), daysAgo(to), dayOfMonth).map((date) => ({ ...expense, date })),
  );
  const oneOff = EXPENSES.map(({ daysAgo: ago, ...expense }) => ({
    ...expense,
    date: daysAgo(ago),
  }));
  for (const { project, ...expense } of [...monthly, ...oneOff]) {
    await call('POST', '/expenses', { ...expense, projectId: projectSeed(project).id });
  }

  // Invoices, numbered per year of issue
  const perYear = new Map<string, number>();
  for (const seedInvoice of INVOICES) {
    const issueDate = daysAgo(seedInvoice.issued);
    const year = issueDate.slice(0, 4);
    const serial = (perYear.get(year) ?? 0) + 1;
    perYear.set(year, serial);
    const invoice = await call<Invoice>('POST', '/invoices', {
      customerId: customerId(seedInvoice.customer),
      number: `RE-${year}-${String(serial).padStart(3, '0')}`,
      issueDate,
      dueDate: addDays(issueDate, PAYMENT_TERM_DAYS),
      subject: seedInvoice.subject,
      discountBasisPoints: seedInvoice.discountBasisPoints,
      import: {
        from: daysAgo(seedInvoice.from),
        to: daysAgo(seedInvoice.to),
        projectId:
          seedInvoice.project === undefined ? undefined : projectSeed(seedInvoice.project).id,
        grouping: seedInvoice.grouping,
        expenses: seedInvoice.expenses,
      },
    });
    if (seedInvoice.draft) continue;
    await call('PATCH', `/invoices/${invoice.id}`, {
      sentOn: issueDate,
      paidOn: seedInvoice.paid === undefined ? null : daysAgo(seedInvoice.paid),
    });
  }

  // Archive last: archived Customers and Projects drop out of the pickers, not out of history
  for (const customer of CUSTOMERS) {
    for (const project of customer.projects.filter((p) => p.archived)) {
      await call('PATCH', `/projects/${projectSeed(project.key).id}`, { archived: true });
    }
    if (customer.archived) {
      await call('PATCH', `/customers/${customerId(customer.name)}`, { archived: true });
    }
  }

  db.$client.close();
  console.log(`Seeded ${dir}`);
  console.log(
    `${customers.size} customers, ${projects.size} projects, ${timeEntryCount} time entries, ${monthly.length + oneOff.length} expenses, ${INVOICES.length} invoices`,
  );
  console.log(
    generated
      ? `Login secret (also in ${join(dir, 'secret')}): ${secret}`
      : 'Login secret: DRECK_SECRET',
  );
}

/** In-process client for `/api/v1`; throws on any error response. */
function apiClient(app: ReturnType<typeof createApp>, secret: string): Call {
  return async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await app.request(`/api/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} failed with ${res.status}: ${text}`);
    return (text ? JSON.parse(text) : null) as T;
  };
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Unknown seed reference: ${name}`);
  return value;
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function isDayOff(monthDay: string): boolean {
  return (
    HOLIDAYS.has(monthDay) ||
    VACATIONS.some(([from, to]) =>
      from <= to ? monthDay >= from && monthDay <= to : monthDay >= from || monthDay <= to,
    )
  );
}

/** Dates with the given day of month between `from` and `to`, both inclusive. */
function monthDays(from: string, to: string, dayOfMonth: number): string[] {
  const dates: string[] = [];
  for (let month = `${from.slice(0, 7)}-01`; month <= to; month = addMonth(month)) {
    const date = `${month.slice(0, 8)}${String(dayOfMonth).padStart(2, '0')}`;
    if (date >= from && date <= to) dates.push(date);
  }
  return dates;
}

function addMonth(firstOfMonth: string): string {
  const d = new Date(`${firstOfMonth}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Half the entries look tracked with the Timer (odd seconds), half typed in as quarter hours. */
function durationSeconds(random: () => number, minutes: number): number {
  if (random() < 0.5) return Math.round(minutes) * 60 + randomInt(random, 0, 59);
  return Math.max(1, Math.round(minutes / 15)) * 15 * 60;
}

/** Deterministic PRNG in [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return required(items[Math.floor(random() * items.length)], 'empty list');
}

/** `count` distinct items, each draw proportional to `weight`. */
function pickWeighted<T extends { weight: number }>(
  random: () => number,
  items: readonly T[],
  count: number,
): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    let rest = random() * pool.reduce((sum, item) => sum + item.weight, 0);
    let index = 0;
    while (index < pool.length - 1 && rest >= (pool[index]?.weight ?? 0)) {
      rest -= pool[index]?.weight ?? 0;
      index += 1;
    }
    picked.push(...pool.splice(index, 1));
  }
  return picked;
}
