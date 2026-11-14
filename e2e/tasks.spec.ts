import { expect, type Page, test } from '@playwright/test';
import { createCustomer, uniqueName } from './support/api';
import { euro } from './support/format';
import { statCard } from './support/ui';

// Full hours only, so Rounding (15 minutes) does not change the amounts

/** Other specs create Projects through the API; they start without Default Tasks. */
async function clearDefaultTasks(page: Page): Promise<void> {
  const response = await page.request.patch('/api/v1/settings', { data: { defaultTasks: [] } });
  expect(response.ok()).toBe(true);
}

async function trackTime(page: Page, project: string, task: string): Promise<void> {
  await page.getByRole('button', { name: 'Zeit erfassen' }).click();
  const dialog = page.getByRole('dialog', { name: /Neuer Time Entry/ });
  await dialog.getByRole('combobox', { name: 'Project' }).click();
  await page.getByRole('option', { name: project, exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Task' }).click();
  await page.getByRole('option', { name: task, exact: true }).click();
  await dialog.getByLabel('Datum').fill('2026-03-02');
  await dialog.getByLabel('Dauer').fill('1:00');
  await dialog.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => clearDefaultTasks(page));
test.afterEach(async ({ page }) => clearDefaultTasks(page));

test('Default Tasks, eigene Hourly Rate pro Task und nicht billable Tasks', async ({ page }) => {
  const customer = await createCustomer(page.request, uniqueName('Kunde'), 10000);
  const project = uniqueName('Website');

  await test.step('Default Tasks in den Einstellungen anlegen', async () => {
    await page.goto('/settings');
    await page
      .getByRole('navigation', { name: 'Bereiche der Einstellungen' })
      .getByRole('link', { name: 'Tasks' })
      .click();
    await expect(page.getByRole('heading', { name: 'Default Tasks' })).toBeVisible();
    await page.getByRole('button', { name: 'Task hinzufügen' }).click();
    // The new row takes the focus
    await expect(page.getByLabel('Task 1')).toBeFocused();
    await page.keyboard.type('Design');
    await page.getByRole('button', { name: 'Task hinzufügen' }).click();
    await page.getByLabel('Task 2').fill('Akquise');
    await page.getByRole('checkbox', { name: 'Billable' }).nth(1).uncheck();
    await page.getByRole('button', { name: 'Tasks speichern' }).click();
    await expect(page.getByText('Gespeichert.')).toBeVisible();
  });

  await test.step('Neues Project übernimmt sie, Design bekommt eine eigene Hourly Rate', async () => {
    await page.goto(`/projects/new?customerId=${customer.id}`);
    await page.getByLabel('Project-Name').fill(project);
    // Sorted by name
    await expect(page.getByLabel('Task 1')).toHaveValue('Akquise');
    await expect(page.getByLabel('Task 2')).toHaveValue('Design');
    // Only billable Tasks have a rate field
    await page.getByLabel('Eigene Hourly Rate').fill('150,00');
    await page.getByRole('button', { name: 'Project speichern' }).click();
    await expect(page.getByRole('heading', { name: project })).toBeVisible();
  });

  await test.step('Time Entries mit Task erfassen', async () => {
    await page.goto('/');
    await trackTime(page, project, 'Design');
    await trackTime(page, project, 'Akquise');
  });

  await test.step('Nur die billable Stunde zählt, mit der Rate des Tasks', async () => {
    await page.goto('/projects');
    await page.getByRole('link', { name: project }).click();
    await expect(statCard(page, 'Gesamtstunden').value).toHaveText('2:00');
    await expect(statCard(page, 'Betrag Zeit').value).toHaveText(euro(15000));
  });

  await test.step('Neue Rate des Tasks auf bestehende Time Entries übernehmen', async () => {
    await page.getByRole('link', { name: 'Project bearbeiten' }).click();
    await page.getByLabel('Eigene Hourly Rate').fill('160,00');
    await page.getByRole('button', { name: 'Project aktualisieren' }).click();
    const dialog = page.getByRole('dialog', { name: 'Bestehende Time Entries übernehmen?' });
    await expect(dialog.getByText('1 Time Entries, 1:00 Stunden')).toBeVisible();
    await expect(dialog.getByText(`${euro(15000)} → ${euro(16000)}`)).toBeVisible();
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(statCard(page, 'Betrag Zeit').value).toHaveText(euro(16000));
  });
});

type ApiTask = { id: number; name: string };

/** Today in Vienna as `YYYY-MM-DD`, the day the new Invoice ends on. */
function viennaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
}

test('Task mit Time Entries wird archiviert, nicht billable Zeit kommt nicht auf die Rechnung', async ({
  page,
}) => {
  const today = viennaToday();
  const customer = await createCustomer(page.request, uniqueName('Kunde'), 10000);
  const name = uniqueName('Shop');
  const created = await page.request.post('/api/v1/projects', {
    data: {
      customerId: customer.id,
      name,
      tasks: [
        { name: 'Design', billable: true },
        { name: 'Akquise', billable: false },
      ],
    },
  });
  expect(created.ok()).toBe(true);
  const project = (await created.json()) as { id: number; tasks: ApiTask[] };
  const taskId = (task: string): number => {
    const found = project.tasks.find((t) => t.name === task);
    if (!found) throw new Error(`Task ${task} missing`);
    return found.id;
  };
  for (const [task, hours] of [
    ['Design', 2],
    ['Akquise', 1],
  ] as const) {
    const entry = await page.request.post('/api/v1/time-entries', {
      data: {
        projectId: project.id,
        taskId: taskId(task),
        date: today,
        durationSeconds: hours * 3600,
      },
    });
    expect(entry.ok()).toBe(true);
  }

  await test.step('Nicht billable Stunden stehen im Project, aber ohne Betrag', async () => {
    await page.goto(`/projects/${project.id}`);
    await expect(statCard(page, 'Gesamtstunden').value).toHaveText('3:00');
    await expect(statCard(page, 'Betrag Zeit').value).toHaveText(euro(20000));
  });

  await test.step('Entfernen archiviert den Task mit Time Entries', async () => {
    await page.getByRole('link', { name: 'Project bearbeiten' }).click();
    await page.getByRole('button', { name: 'Akquise entfernen' }).click();
    await page.getByRole('button', { name: 'Project aktualisieren' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await page.getByRole('link', { name: 'Project bearbeiten' }).click();
    await expect(page.getByText('Archived', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Wiederherstellen' }).click();
    await expect(page.getByText('Archived', { exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Project aktualisieren' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
  });

  await test.step('Rechnung: nur der billable Task, Position "Project – Task"', async () => {
    await page.goto('/projects');
    await page.getByRole('button', { name: `Aktionen für ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Verrechnen' }).click();
    await page.getByRole('combobox', { name: 'Gruppierung' }).click();
    await page.getByRole('option', { name: 'Eine Position pro Task' }).click();
    const rows = page
      .getByRole('region', { name: 'Vorschau der Positionen' })
      .locator('tbody')
      .getByRole('row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(`${name} – Design`);
    await expect(page.locator('tfoot')).toContainText(euro(20000));
  });
});
