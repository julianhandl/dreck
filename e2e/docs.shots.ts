import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  devices,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';
import { startTimer } from './support/api';
import { E2E_SECRET } from './support/secret';

/**
 * Generates the screenshots of docs/*.md against the seeded instance (`bun run docs:screenshots`).
 * The UI is English, the seeded data (customers, projects, texts) German. One scene after the
 * other: later scenes build on the state of earlier ones, so the order matters.
 */

const OUT = 'docs/img';
const API = '/api/v1';
const HOUR_MS = 3600 * 1000;
// Modal dialogs only: the open project picker is a dialog as well
const MODAL = 'div[role="dialog"][aria-labelledby]';
const DESKTOP = { width: 1280, height: 800 };
const CONTEXT = {
  locale: 'en-GB',
  timezoneId: 'Europe/Vienna',
  deviceScaleFactor: 2,
} as const;

type Task = { id: number; name: string; billable: boolean };
type Project = { id: number; customerId: number; name: string; tasks: Task[] };
type Customer = { id: number; name: string };

test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let page: Page;
let request: APIRequestContext;
let projects: Project[];
let customers: Customer[];

/** Screenshot of a page, an element or the whole scrollable page. */
async function shot(target: Page | Locator, name: string, fullPage = false): Promise<void> {
  await target.screenshot({
    path: `${OUT}/${name}.png`,
    ...('goto' in target ? { fullPage } : {}),
  });
}

/** Screenshot of the open dialog only. */
async function shotDialog(name: string): Promise<void> {
  await shot(page.locator(MODAL), name);
}

function project(name: string, customer?: string): Project {
  const customerId = customers.find((c) => c.name === customer)?.id;
  const found = projects.find(
    (p) => p.name === name && (customerId === undefined || p.customerId === customerId),
  );
  if (!found) throw new Error(`Project ${name} not found`);
  return found;
}

function customer(name: string): Customer {
  const found = customers.find((c) => c.name === name);
  if (!found) throw new Error(`Customer ${name} not found`);
  return found;
}

async function get<T>(path: string): Promise<T> {
  const response = await request.get(`${API}${path}`);
  expect(response.ok(), path).toBe(true);
  return response.json() as Promise<T>;
}

async function send(method: 'post' | 'patch', path: string, data: unknown): Promise<unknown> {
  const response = await request[method](`${API}${path}`, { data });
  expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBe(true);
  return response.json();
}

/** `YYYY-MM-DD` of today in Vienna. */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
}

/** `HH:MM` in Vienna. */
function viennaTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);
}

async function newTimeEntry(
  projectName: string,
  seconds: number,
  description: string,
  task?: string,
  customerName?: string,
): Promise<{ id: number }> {
  const p = project(projectName, customerName);
  return (await send('post', '/time-entries', {
    projectId: p.id,
    taskId: p.tasks.find((t) => t.name === task)?.id,
    date: today(),
    durationSeconds: seconds,
    description,
  })) as { id: number };
}

async function openApp(path: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByText('Loading …')).toBeHidden();
}

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  context = await browser.newContext({ ...CONTEXT, viewport: DESKTOP });
  page = await context.newPage();
  request = context.request;
});

test.afterAll(async () => {
  await context.close();
});

test('Getting started: sign in', async () => {
  await page.goto('/');
  const login = page.getByRole('dialog', { name: 'Sign in' });
  await expect(login).toBeVisible();
  await shot(login, 'login');
  await login.getByLabel('Password').fill(E2E_SECRET);
  await login.getByRole('button', { name: 'Sign in' }).click();
  await expect(login).toBeHidden();

  // The seed speaks German; the docs show the English UI
  const settings = (await get<Record<string, unknown>>('/settings')) ?? {};
  await send('patch', '/settings', { ...settings, language: 'en' });
  [projects, customers] = await Promise.all([
    get<Project[]>('/projects'),
    get<Customer[]>('/customers'),
  ]);
});

test('Settings and default tasks', async () => {
  await openApp('/settings');
  await expect(page.getByLabel('Default hourly rate')).toBeVisible();
  await shot(page, 'settings', true);

  // Invoices section: from its heading down
  const heading = page.getByRole('heading', { name: 'Invoices' });
  const box = await heading.boundingBox();
  const height = (await page.locator('body').boundingBox())?.height;
  if (!box || !height) throw new Error('No Invoices heading');
  await page.screenshot({
    path: `${OUT}/settings-invoicing.png`,
    fullPage: true,
    clip: { x: 0, y: Math.max(0, box.y - 24), width: DESKTOP.width, height: height - box.y + 24 },
  });

  await openApp('/settings/tasks');
  await expect(page.getByLabel('Task 1')).toBeVisible();
  await shot(page, 'settings-tasks', true);
});

test('Customers and projects: forms', async () => {
  await openApp('/projects/customers/new');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Tischlerei Aigner');
  await page.getByLabel('Address').fill('Dorfstraße 3\n4400 Steyr\nUID: ATU11223344');
  await shot(page, 'customer-new', true);

  await openApp('/projects/new');
  await page.getByRole('combobox', { name: 'Customer' }).click();
  await page.getByRole('option', { name: 'Alpenlogistik Transport GmbH' }).click();
  await page.getByLabel('Project name').fill('Weinkarte als PDF');
  await shot(page, 'project-new', true);

  await openApp('/projects');
  await shot(page, 'projects');
  await page
    .getByRole('button', { name: /^Actions for/ })
    .first()
    .click();
  await shot(page, 'projects-actions');
  await page.keyboard.press('Escape');
});

test('Time: screen, dialog, picker, task', async () => {
  await newTimeEntry('Online-Shop', 3 * 3600, 'Versandkostenregeln', 'Entwicklung');
  await newTimeEntry('Newsletter-Anbindung', 90 * 60, 'Anmeldeformular');
  await newTimeEntry(
    'Website',
    2.25 * 3600,
    'Layout Startseite umsetzen',
    undefined,
    'Kanzlei Huber & Partner',
  );
  const rateEntry = await newTimeEntry('Online-Shop', 3600, 'Kulanz: Zahlungsfehler');
  await send('patch', `/time-entries/${rateEntry.id}`, { hourlyRateMinor: 6000 });

  await openApp('/');
  await expect(page.getByText('Versandkostenregeln')).toBeVisible();
  await shot(page, 'time-screen');

  // Keyboard: ↓ selects the first entry
  await page.keyboard.press('ArrowDown');
  await shot(page, 'time-selected');
  await page.keyboard.press('Escape');

  // New entry
  await page.getByRole('button', { name: 'Track time' }).click();
  const dialog = page.locator(MODAL);
  await expect(dialog).toBeVisible();
  await shotDialog('time-dialog-new');

  // Project picker
  await dialog.getByRole('combobox', { name: 'Project' }).click();
  await expect(page.getByText('Used today')).toBeVisible();
  await page.screenshot({ path: `${OUT}/project-picker.png` });
  await page
    .getByRole('option', { name: /Online-Shop/ })
    .first()
    .click();

  // Task field, duration entered
  await dialog.getByRole('combobox', { name: 'Task' }).click();
  await page.getByRole('option', { name: 'Projektmanagement' }).click();
  await dialog.getByLabel('Notes (optional)').fill('Abstimmung mit der Bäckerei');
  await dialog.getByLabel('Duration').fill('0:45');
  await expect(dialog.getByRole('button', { name: 'Save entry' })).toBeVisible();
  await shotDialog('time-dialog-task');
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  // Start a timer, then a second one: the dialog announces the stop
  // A timer that started 47 minutes ago, so the screens show a realistic duration
  await startTimer(
    request,
    project('Newsletter-Anbindung').id,
    new Date(Date.now() - 47 * 60 * 1000),
  );
  await openApp('/');
  await expect(page.getByRole('button', { name: /^Stop timer for/ })).toBeVisible();
  await shot(page, 'time-screen-timer');

  await page.getByRole('button', { name: 'Track time' }).click();
  await dialog.getByRole('combobox', { name: 'Project' }).click();
  await page
    .getByRole('option', { name: /Website/ })
    .first()
    .click();
  await expect(dialog.getByText(/Stops .* and starts the new timer/)).toBeVisible();
  await shotDialog('time-dialog-running');
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  // Edit: folded hourly rate, open, with the entry corrected by hand
  await page.getByRole('button', { name: 'Edit time entry for Online-Shop' }).last().click();
  await expect(dialog.getByText('Edit time entry')).toBeVisible();
  await dialog.locator('summary').click();
  await shotDialog('time-dialog-edit');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
});

test('Forgotten timer', async () => {
  // Three days ago at 08:00 UTC: starts the forgotten timer and stops the running one
  const startedAt = new Date(Date.now() - 3 * 24 * HOUR_MS);
  startedAt.setUTCHours(8, 0, 0, 0);
  const p = project('Server-Migration');
  // A start in the past is only accepted when no timer runs
  await send('post', '/timer/stop', {});
  await startTimer(request, p.id, startedAt);

  await openApp('/');
  await expect(page.getByText(/has been running for a long time/)).toBeVisible();
  await shot(page, 'forgotten-notice');

  await page.getByRole('button', { name: `Stop timer for ${p.name}` }).click();
  const dialog = page.getByRole('dialog', { name: 'When did you stop?' });
  await expect(dialog).toBeVisible();
  await dialog
    .getByLabel(/Stopped at/)
    .fill(viennaTime(new Date(startedAt.getTime() + 3 * HOUR_MS)));
  await shot(dialog, 'forgotten-dialog');
  await dialog.getByRole('button', { name: 'Stop at this time' }).click();
  await expect(dialog).toBeHidden();
});

test('Tasks and hourly rates: project and customer', async () => {
  const shop = project('Online-Shop');
  await openApp(`/projects/${shop.id}/edit`);
  await expect(page.getByLabel('Task 1')).toBeVisible();
  await shot(page, 'project-edit-tasks', true);

  // Rate question for the project: nothing is saved, the dialog is closed again
  await page.getByLabel('Hourly rate', { exact: true }).fill('105,00');
  await page.getByRole('button', { name: 'Update project' }).click();
  const rate = page.getByRole('dialog', { name: 'Apply to existing time entries?' });
  await expect(rate.getByText(/time entries, .* hours/)).toBeVisible();
  await shot(rate, 'rate-change-project');
  await page.keyboard.press('Escape');

  // … and for the customer, with its projects
  const lechner = customer('Bergbäckerei Lechner GmbH');
  await openApp(`/projects/customers/${lechner.id}/edit`);
  await page.getByLabel('Hourly rate', { exact: true }).fill('110,00');
  await page.getByRole('button', { name: 'Update customer' }).click();
  await expect(rate.getByText('Projects with the new hourly rate')).toBeVisible();
  await shot(rate, 'rate-change-customer');
  await page.keyboard.press('Escape');
});

test('Expenses, project detail and report', async () => {
  await openApp('/expenses');
  await shot(page, 'expenses');
  await page.getByRole('button', { name: 'Track expense' }).click();
  // The form opens inline above the list
  const form = page.locator('form');
  await form.getByRole('combobox', { name: 'Project', exact: true }).click();
  await page
    .getByRole('option', { name: /Online-Shop/ })
    .first()
    .click();
  await form.getByRole('textbox', { name: 'Description' }).fill('Domain-Verlängerung');
  await form.getByRole('textbox', { name: 'Amount' }).fill('1.234,50');
  await shot(page, 'expense-form');

  await openApp(`/projects/${project('Online-Shop').id}`);
  await expect(page.getByText('Hours per week')).toBeVisible();
  await shot(page, 'project-detail', true);

  await openApp('/reports');
  await expect(page.getByText('To invoice').first()).toBeVisible();
  await shot(page, 'report', true);
});

test('Mobile', async ({ browser }) => {
  const mobile = await browser.newContext({
    ...devices['Pixel 7'],
    locale: CONTEXT.locale,
    timezoneId: CONTEXT.timezoneId,
    storageState: await context.storageState(),
  });
  const phone = await mobile.newPage();
  await phone.goto('/');
  await expect(phone.getByText('Loading …')).toBeHidden();
  await expect(phone.getByRole('button', { name: 'Track time' })).toBeVisible();
  await phone.screenshot({ path: `${OUT}/mobile-time.png` });
  await phone.getByRole('button', { name: 'Menu' }).click();
  await phone.screenshot({ path: `${OUT}/mobile-menu.png` });
  await mobile.close();
});

test('Invoices', async () => {
  await openApp('/invoices');
  await expect(page.getByText('Paid in')).toBeVisible();
  await shot(page, 'invoices');

  await openApp('/invoices/new');
  await page.getByRole('combobox', { name: 'Customer' }).click();
  await page.getByRole('option', { name: 'Bergbäckerei Lechner GmbH' }).click();
  await expect(page.getByText(/time entries, .* hours/)).toBeVisible();
  await shot(page, 'invoice-new', true);
  await page.getByRole('button', { name: 'Create invoice' }).click();

  // Draft opens for editing
  await expect(page.getByRole('heading', { name: /^Edit invoice/ })).toBeVisible();
  await shot(page, 'invoice-edit', true);
  await page.getByRole('button', { name: 'Save invoice' }).click();

  // Detail with actions
  await expect(page.getByRole('button', { name: 'Print / PDF' })).toBeVisible();
  await shot(page, 'invoice-detail', true);
  // A sent invoice offers "Back to draft" in the actions
  await page.getByRole('button', { name: 'Mark as sent' }).click();
  await expect(page.getByRole('button', { name: 'Actions' })).toBeVisible();
  await page.getByRole('button', { name: 'Actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'Back to draft' })).toBeVisible();
  await shot(page, 'invoice-actions');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ media: 'print' });
  await shot(page, 'invoice-print', true);
  await page.emulateMedia({ media: 'screen' });

  // Invoiced entries are locked
  await openApp('/');
  await expect(page.getByText('Invoiced').first()).toBeVisible();
  await shot(page, 'time-invoiced');
});
