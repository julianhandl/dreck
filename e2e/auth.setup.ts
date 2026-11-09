import { expect, test as setup } from '@playwright/test';
import { E2E_SECRET } from './support/secret';

const AUTH_FILE = 'e2e/.auth/session.json';

// Settings every other test relies on: EUR, Default Hourly Rate 80,00 €, Rounding 15 minutes
setup('Login, Onboarding und Einstellungen', async ({ page }) => {
  await page.goto('/');

  // The first request gets a 401 and opens the login dialog over the page
  const login = page.getByRole('dialog', { name: 'Anmelden' });
  await login.getByLabel('Passwort').fill(E2E_SECRET);
  await login.getByRole('button', { name: 'Anmelden' }).click();
  await expect(login).toBeHidden();

  // A fresh instance without Customer starts with the onboarding
  await expect(page.getByRole('heading', { name: 'Willkommen bei Dreck' })).toBeVisible();
  await page.getByLabel('Für wen arbeitest du?').fill('Intern');
  await page.getByLabel('Woran?').fill('Verwaltung');
  await page.getByLabel('Währung').fill('EUR');
  await page.getByLabel('Default Hourly Rate').fill('80,00');
  await page.getByText('Sprache und Zeitzone').click();
  // Prefilled from the browser
  await expect(page.getByLabel('Zeitzone')).toHaveValue('Europe/Vienna');
  await page.getByRole('button', { name: 'Loslegen' }).click();

  // Time screen with the only Project prefilled
  await page.getByRole('button', { name: 'Zeit erfassen' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('combobox', { name: 'Project' })).toHaveText(/Verwaltung/);
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();

  await page.goto('/settings');
  await expect(page.getByLabel('Währung')).toBeDisabled();
  await page.getByRole('combobox', { name: 'Rounding' }).click();
  await page.getByRole('option', { name: '15 Minuten' }).click();
  await page.getByRole('button', { name: 'Einstellungen speichern' }).click();
  await expect(page.getByText('Gespeichert.')).toBeVisible();

  // Stored on the server: still there after a reload
  await page.reload();
  await expect(page.getByLabel('Default Hourly Rate')).toHaveValue('80,00');
  await expect(page.getByRole('combobox', { name: 'Rounding' })).toHaveText(/15 Minuten/);

  await page.context().storageState({ path: AUTH_FILE });
});
