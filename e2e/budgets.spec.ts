import { expect, type Page, test } from '@playwright/test';
import { createCustomer, createProject, createTimeEntry, uniqueName } from './support/api';

async function choose(page: Page, combobox: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' });

test('Budget: Stunden-Budget setzen, knapp und überschritten anzeigen', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request, uniqueName('Kunde'), 10_000);
  const name = uniqueName('Projekt');
  const project = await createProject(request, customer.id, name);

  await test.step('Budget am Project setzen', async () => {
    await page.goto(`/projects/${project.id}/edit`);
    await choose(page, 'Art', 'Stunden');
    await page.getByLabel('Budget in Stunden').fill('10');
    await page.getByRole('button', { name: 'Project aktualisieren' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: `Budget von ${name}` })).toBeVisible();
  });

  await test.step('Ungültiger Wert wird abgelehnt', async () => {
    await page.goto(`/projects/${project.id}/edit`);
    await page.getByLabel('Budget in Stunden').fill('0');
    await page.getByRole('button', { name: 'Project aktualisieren' }).click();
    await expect(page.getByText('Bitte Stunden größer 0 angeben')).toBeVisible();
  });

  await test.step('8 von 10 Stunden: knapp', async () => {
    await createTimeEntry(request, project.id, today, 8);
    await page.goto('/projects');
    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row.getByText('8 h von 10 h')).toBeVisible();
    await expect(row.getByText('Knapp')).toBeVisible();
    await expect(row.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '28800');
    await expect(row.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '36000');

    await page.goto(`/projects/${project.id}`);
    await expect(page.getByText('Knapp')).toBeVisible();
    await expect(page.getByText('2 h übrig')).toBeVisible();
  });

  await test.step('12 von 10 Stunden: überschritten', async () => {
    await createTimeEntry(request, project.id, today, 4);
    await page.goto('/projects');
    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row.getByText('Überschritten')).toBeVisible();
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByText('+2 h über Budget')).toBeVisible();
  });

  await test.step('Kein Budget entfernt den Balken', async () => {
    await page.goto(`/projects/${project.id}/edit`);
    await choose(page, 'Art', 'Kein Budget');
    await page.getByRole('button', { name: 'Project aktualisieren' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(page.getByRole('progressbar')).toBeHidden();
  });
});

test('Budget: monatliches Betrags-Budget zählt nur den laufenden Monat', async ({
  page,
  request,
}) => {
  const customer = await createCustomer(request, uniqueName('Kunde'), 10_000);
  const name = uniqueName('Projekt');
  const project = await createProject(request, customer.id, name);
  await request.patch(`/api/v1/projects/${project.id}`, {
    data: {
      budget: { type: 'amount', amountMinor: 100_000, monthly: true, includeExpenses: false },
    },
  });
  // 5 h last year do not count, 9 h today do (900 of 1000 EUR)
  await createTimeEntry(request, project.id, `${Number(today.slice(0, 4)) - 1}-01-15`, 5);
  await createTimeEntry(request, project.id, today, 9);

  await page.goto('/projects');
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row.getByText(/900,00.* von .*1\.000,00.* im /)).toBeVisible();
  await expect(row.getByText('Knapp')).toBeVisible();
});
