import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  createCustomer,
  createExpense,
  createProject,
  createTimeEntry,
  listTimeEntries,
  uniqueName,
} from './support/api';
import { euro } from './support/format';

// Hourly Rate 100,00 €, quarter hours only, so Rounding (15 minutes) does not change the amounts

/** Today in Vienna as `YYYY-MM-DD`, the day the app and the new Invoice start from. */
function viennaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
}

/** Rows of the item preview on "Neue Rechnung", without header and footer. */
function previewRows(page: Page): Locator {
  return page
    .getByRole('region', { name: 'Vorschau der Positionen' })
    .locator('tbody')
    .getByRole('row');
}

async function choose(page: Page, combobox: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Ids of the given Time Entries that are invoiced, ascending. */
async function invoicedIds(page: Page, ids: number[]): Promise<number[]> {
  const entries = await listTimeEntries(page.request);
  return entries
    .filter((e) => ids.includes(e.id) && e.invoiceItemId !== null)
    .map((e) => e.id)
    .toSorted((a, b) => a - b);
}

test('Verrechnen: Vorschau folgt Project und Gruppierung, Rechnung übernimmt die Positionen', async ({
  page,
}) => {
  const today = viennaToday();
  const newYear = `${today.slice(0, 4)}-01-01`;
  const customerName = uniqueName('Kunde');
  const customer = await createCustomer(page.request, customerName, 10000);
  // "App" sorts before "Web" on the Invoice
  const web = uniqueName('Web');
  const app = uniqueName('App');
  const webProject = await createProject(page.request, customer.id, web);
  const appProject = await createProject(page.request, customer.id, app);
  const design1 = await createTimeEntry(page.request, webProject.id, newYear, 1, 'Design');
  const design2 = await createTimeEntry(page.request, webProject.id, today, 0.5, 'Design');
  const code = await createTimeEntry(page.request, webProject.id, today, 0.25, 'Code');
  const appEntry = await createTimeEntry(page.request, appProject.id, today, 1);
  await createExpense(page.request, webProject.id, today, 4500, 'Bahn');

  await test.step('"Verrechnen" in den Aktionen des Projects', async () => {
    await page.goto('/projects');
    await page.getByRole('button', { name: `Aktionen für ${web}` }).click();
    await page.getByRole('menuitem', { name: 'Verrechnen' }).click();
    await expect(page.getByRole('heading', { name: 'Neue Rechnung' })).toBeVisible();
  });

  await test.step('Vorbelegung: Project, 1. Jänner bis heute, pro Beschreibung', async () => {
    await expect(page.getByRole('combobox', { name: 'Customer' })).toHaveText(
      new RegExp(customerName),
    );
    await expect(page.getByRole('combobox', { name: 'Project' })).toHaveText(web);
    await expect(page.getByLabel('Von')).toHaveValue(newYear);
    await expect(page.getByLabel('Bis')).toHaveValue(today);
    const grouping = page.getByRole('combobox', { name: 'Gruppierung' });
    await expect(grouping).toHaveText('Eine Position pro Beschreibung');
    // Per Project makes no sense for a single Project
    await grouping.click();
    await expect(page.getByRole('option', { name: 'Eine Position pro Project' })).toBeDisabled();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('status').first()).toContainText(
      `3 Time Entries, 1:45 Stunden, ${euro(17500)}`,
    );
    await expect(previewRows(page)).toHaveText([
      new RegExp(`^${web}: Design \\(.*1,50.*${euro(15000)}`),
      new RegExp(`^${web}: Code \\(.*0,25.*${euro(2500)}`),
      new RegExp(`^${web}: Bahn \\(.*1,00.*${euro(4500)}`),
    ]);
    await expect(page.locator('tfoot')).toContainText(euro(22000));
  });

  await test.step('Andere Gruppierung und Projects ändern die Vorschau sofort', async () => {
    await choose(page, 'Gruppierung', 'Eine Position pro Time Entry');
    await expect(previewRows(page)).toHaveText([
      new RegExp(`^${web}: Design \\(.*1,00`),
      new RegExp(`^${web}: Design \\(.*0,50`),
      new RegExp(`^${web}: Code \\(.*0,25`),
      new RegExp(`^${web}: Bahn \\(`),
    ]);

    await choose(page, 'Project', 'Alle Projects');
    await choose(page, 'Gruppierung', 'Eine Position pro Project');
    await expect(previewRows(page)).toHaveText([
      new RegExp(`^${app} \\(.*1,00.*${euro(10000)}`),
      new RegExp(`^${web} \\(.*1,75.*${euro(17500)}`),
      new RegExp(`^${web}: Bahn \\(`),
    ]);
    await expect(page.locator('tfoot')).toContainText(euro(32000));

    await page.getByRole('checkbox', { name: 'Billable Ausgaben übernehmen' }).click();
    await expect(previewRows(page)).toHaveCount(2);
    await page.getByRole('checkbox', { name: 'Billable Ausgaben übernehmen' }).click();

    // Choosing one Project leaves "pro Project" for "pro Beschreibung"
    await choose(page, 'Project', web);
    await expect(page.getByRole('combobox', { name: 'Gruppierung' })).toHaveText(
      'Eine Position pro Beschreibung',
    );
    await expect(previewRows(page)).toHaveCount(3);
  });

  await test.step('Rechnung anlegen: Entwurf mit den Positionen der Vorschau', async () => {
    await page.getByRole('button', { name: 'Rechnung anlegen' }).click();
    await expect(page.getByRole('heading', { name: /^Rechnung .* bearbeiten$/ })).toBeVisible();
    await expect(page.getByLabel('Beschreibung Position 1')).toHaveValue(
      new RegExp(`^${web}: Design \\(`),
    );
    await expect(page.getByLabel('Beschreibung Position 2')).toHaveValue(
      new RegExp(`^${web}: Code \\(`),
    );
    await expect(page.getByLabel('Beschreibung Position 3')).toHaveValue(
      new RegExp(`^${web}: Bahn \\(`),
    );
    expect(await invoicedIds(page, [design1.id, design2.id, code.id, appEntry.id])).toEqual([
      design1.id,
      design2.id,
      code.id,
    ]);
  });

  await test.step('Entfernte Position gibt ihren Time Entry frei', async () => {
    await page.getByRole('button', { name: 'Position 2 entfernen' }).click();
    await page.getByRole('button', { name: 'Rechnung speichern' }).click();
    await expect(page.getByRole('heading', { name: /^Rechnung [^ ]+$/ })).toBeVisible();
    await expect(page.getByText(`${euro(19500)} fällig am`)).toBeVisible();
    const items = page.getByRole('table').locator('tbody').getByRole('row');
    await expect(items).toHaveText([new RegExp(`^${web}: Design`), new RegExp(`^${web}: Bahn`)]);
    expect(await invoicedIds(page, [design1.id, design2.id, code.id])).toEqual([
      design1.id,
      design2.id,
    ]);
  });
});

test('Status: gesendet sperrt, Zahlung erfassen, zurück zum Entwurf, Löschen gibt frei', async ({
  page,
}) => {
  const customerName = uniqueName('Kunde');
  const customer = await createCustomer(page.request, customerName, 10000);
  const project = await createProject(page.request, customer.id, uniqueName('Project'));
  const entry = await createTimeEntry(page.request, project.id, viennaToday(), 1);

  await page.goto('/invoices/new');
  await choose(page, 'Customer', customerName);
  await expect(previewRows(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Rechnung anlegen' }).click();
  await expect(page.getByRole('heading', { name: /^Rechnung .* bearbeiten$/ })).toBeVisible();
  await page.getByRole('link', { name: 'Abbrechen' }).click();
  const edit = page.getByRole('link', { name: 'Bearbeiten' });
  await expect(edit).toBeVisible();
  await expect(page.getByText('Entwurf', { exact: true })).toBeVisible();

  await test.step('Als gesendet markieren sperrt den Inhalt', async () => {
    await page.getByRole('button', { name: 'Als gesendet markieren' }).click();
    await expect(page.getByText('Gesendet', { exact: true })).toBeVisible();
    await expect(page.getByText(/^Gesendete und bezahlte Rechnungen sind gesperrt/)).toBeVisible();
    await expect(edit).toBeHidden();
  });

  await test.step('Zahlung erfassen', async () => {
    await page.getByRole('button', { name: 'Zahlung erfassen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Zahlung erfassen' });
    await expect(dialog.getByLabel('Bezahlt am')).toHaveValue(viennaToday());
    await dialog.getByRole('button', { name: 'Zahlung speichern' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Bezahlt', { exact: true })).toBeVisible();
    await expect(page.getByText(`${euro(10000)} bezahlt am`)).toBeVisible();
  });

  const actions = page.getByRole('button', { name: /^Aktionen für Rechnung / });

  await test.step('Zurück zum Entwurf entsperrt', async () => {
    await actions.click();
    await page.getByRole('menuitem', { name: 'Zurück zum Entwurf' }).click();
    await expect(page.getByText('Entwurf', { exact: true })).toBeVisible();
    await expect(edit).toBeVisible();
  });

  await test.step('Löschen gibt den Time Entry frei', async () => {
    expect(await invoicedIds(page, [entry.id])).toEqual([entry.id]);
    await actions.click();
    await page.getByRole('menuitem', { name: 'Löschen' }).click();
    await expect(page).toHaveURL(/\/invoices$/);
    expect(await invoicedIds(page, [entry.id])).toEqual([]);
  });
});
