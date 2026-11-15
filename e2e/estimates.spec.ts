import { expect, type Page, test } from '@playwright/test';
import { createCustomer, uniqueName } from './support/api';
import { euro } from './support/format';

async function choose(page: Page, combobox: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: combobox }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Creates a draft Estimate for a new Customer through the UI and opens its form. */
async function newEstimate(page: Page): Promise<string> {
  const customerName = uniqueName('Kunde');
  await createCustomer(page.request, customerName, 10000);
  await page.goto('/estimates/new');
  await choose(page, 'Customer', customerName);
  await page.getByRole('button', { name: 'Angebot anlegen' }).click();
  await expect(page.getByRole('heading', { name: /^Angebot .* bearbeiten$/ })).toBeVisible();
  return customerName;
}

test('Angebot: erfassen, senden, annehmen, Rechnung daraus erstellen', async ({ page }) => {
  await newEstimate(page);

  await test.step('Zwei Positionen erfassen, Summe prüfen, speichern', async () => {
    await page.getByLabel('Betreff').fill('Relaunch');
    await page.getByRole('button', { name: 'Position hinzufügen' }).click();
    await page.getByLabel('Beschreibung Position 1').fill('Konzept');
    await page.getByLabel('Menge Position 1').fill('2');
    await page.getByLabel('Einzelpreis Position 1').fill('100,00');
    await page.getByRole('button', { name: 'Position hinzufügen' }).click();
    await page.getByLabel('Beschreibung Position 2').fill('Umsetzung');
    await page.getByLabel('Menge Position 2').fill('1,5');
    await page.getByLabel('Einzelpreis Position 2').fill('80,00');
    await expect(page.getByText('Zwischensumme').locator('+ dd')).toHaveText(euro(32000));
    await page.getByRole('button', { name: 'Angebot speichern' }).click();
    await expect(page.getByRole('heading', { name: /^Angebot / })).toBeVisible();
    await expect(page.getByText('Entwurf', { exact: true })).toBeVisible();
  });

  const edit = page.getByRole('link', { name: 'Bearbeiten' });
  await test.step('Als gesendet markieren: Bearbeiten verschwindet', async () => {
    await expect(edit).toBeVisible();
    await page.getByRole('button', { name: 'Als gesendet markieren' }).click();
    await expect(page.getByText('Gesendet', { exact: true })).toBeVisible();
    await expect(
      page.getByText(/^Gesendete und entschiedene Angebote sind gesperrt/),
    ).toBeVisible();
    await expect(edit).toBeHidden();
  });

  await test.step('Angenommen', async () => {
    await page.getByRole('button', { name: 'Angenommen' }).click();
    await expect(page.getByText('Angenommen', { exact: true })).toBeVisible();
  });

  await test.step('Rechnung erstellen: Positionen im Formular der Rechnung', async () => {
    await page.getByRole('button', { name: 'Rechnung erstellen' }).click();
    await expect(page.getByRole('heading', { name: /^Rechnung .* bearbeiten$/ })).toBeVisible();
    await expect(page.getByLabel('Betreff')).toHaveValue('Relaunch');
    await expect(page.getByLabel('Beschreibung Position 1')).toHaveValue('Konzept');
    await expect(page.getByLabel('Menge Position 1')).toHaveValue('2,00');
    await expect(page.getByLabel('Beschreibung Position 2')).toHaveValue('Umsetzung');
    await expect(page.getByLabel('Menge Position 2')).toHaveValue('1,50');
  });
});

test('Angebot: zurück auf Entwurf und löschen', async ({ page }) => {
  await newEstimate(page);
  await page.getByRole('link', { name: 'Abbrechen' }).click();
  await page.getByRole('button', { name: 'Als gesendet markieren' }).click();
  await page.getByRole('button', { name: 'Abgelehnt' }).click();
  await expect(page.getByText('Abgelehnt', { exact: true })).toBeVisible();

  const actions = page.getByRole('button', { name: /^Aktionen für Angebot / });
  await actions.click();
  await page.getByRole('menuitem', { name: 'Zurück auf Entwurf' }).click();
  await expect(page.getByText('Entwurf', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Bearbeiten' })).toBeVisible();

  page.once('dialog', (dialog) => {
    expect(dialog.message()).toMatch(/^Angebot .* löschen\?$/);
    void dialog.accept();
  });
  await actions.click();
  await page.getByRole('menuitem', { name: 'Löschen' }).click();
  await expect(page).toHaveURL(/\/estimates$/);
});
