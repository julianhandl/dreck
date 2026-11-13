import { expect, type Page, test } from '@playwright/test';
import { createCustomer, createExpense, createProject, uniqueName } from './support/api';

async function choose(page: Page, combobox: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test('Ausgaben nach Customer, Project und Billable filtern', async ({ page, request }) => {
  const customerA = uniqueName('Kunde A');
  const customerB = uniqueName('Kunde B');
  const a = await createCustomer(request, customerA, 10_000);
  const b = await createCustomer(request, customerB, 10_000);
  const projectA = uniqueName('Projekt A');
  const a1 = await createProject(request, a.id, projectA);
  const b1 = await createProject(request, b.id, uniqueName('Projekt B'));
  const billable = uniqueName('Zugticket');
  const ownCost = uniqueName('Software');
  await createExpense(request, a1.id, '2026-03-02', 4_250, billable);
  await createExpense(request, b1.id, '2026-03-03', 1_999, ownCost, false);

  await page.goto('/expenses');
  await expect(page.getByText(billable)).toBeVisible();
  await expect(page.getByText(ownCost)).toBeVisible();

  await choose(page, 'Nach Customer filtern', customerA);
  await expect(page.getByText(billable)).toBeVisible();
  await expect(page.getByText(ownCost)).toBeHidden();
  // Only the chosen Customer's Projects are offered
  await page.getByRole('combobox', { name: 'Nach Project filtern' }).click();
  await expect(page.getByRole('option')).toHaveText(['Alle Projects', projectA]);
  await page.keyboard.press('Escape');

  // Filters live in the URL and survive a reload
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Nach Customer filtern' })).toHaveText(customerA);

  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
  await choose(page, 'Nach Billable filtern', 'Nur nicht billable');
  await expect(page.getByText(ownCost)).toBeVisible();
  await expect(page.getByText(billable)).toBeHidden();

  await choose(page, 'Nach Customer filtern', customerA);
  await expect(page.getByText('Keine Ausgaben für diese Filter.')).toBeVisible();
});
