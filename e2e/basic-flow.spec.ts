import { expect, type Page, test } from '@playwright/test';
import { uniqueName } from './support/api';
import { euro } from './support/format';
import { statCard } from './support/ui';

type Entry = { date: string; duration: string; notes: string };

// Rounding 15 minutes (auth.setup.ts): 1:10 → 1:15, 2:00 → 2:00, 0:20 → 0:30
const ENTRIES: Entry[] = [
  { date: '2026-03-02', duration: '1:10', notes: 'Konzept' },
  { date: '2026-03-03', duration: '2:00', notes: 'Umsetzung' },
  { date: '2026-03-05', duration: '0:20', notes: 'Abstimmung' },
];

async function trackTime(page: Page, project: string, entry: Entry): Promise<void> {
  await page.getByRole('button', { name: 'Zeit erfassen' }).click();
  const dialog = page.getByRole('dialog', { name: /Neuer Time Entry/ });
  await dialog.getByRole('combobox', { name: 'Project' }).click();
  await page.getByRole('option', { name: project, exact: true }).click();
  await dialog.getByLabel('Notizen (optional)').fill(entry.notes);
  await dialog.getByLabel('Datum').fill(entry.date);
  await dialog.getByLabel('Dauer').fill(entry.duration);
  await dialog.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(dialog).toBeHidden();
}

test('Customer, Project und Time Entries anlegen, Report des Projects stimmt', async ({ page }) => {
  const customer = uniqueName('Kunde');
  const project = uniqueName('Website');

  await test.step('Customer anlegen', async () => {
    await page.goto('/projects');
    await page.getByRole('link', { name: 'Neuer Customer' }).click();
    await expect(page.getByRole('heading', { name: 'Neuer Customer' })).toBeVisible();
    await page.getByLabel('Name').fill(customer);
    // Takes over the Default Hourly Rate from the settings
    const rate = page.getByLabel('Hourly Rate', { exact: true });
    await expect(rate).toHaveValue('80,00');
    await rate.fill('90,00');
    await page.getByRole('button', { name: 'Customer speichern' }).click();
  });

  await test.step('Project anlegen', async () => {
    await expect(page.getByRole('heading', { name: 'Neues Project' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Customer' })).toHaveText(customer);
    // Takes over the Hourly Rate of its Customer
    await expect(page.getByLabel('Hourly Rate', { exact: true })).toHaveValue('90,00');
    await page.getByLabel('Project-Name').fill(project);
    await page.getByRole('button', { name: 'Project speichern' }).click();
    await expect(page.getByRole('heading', { name: project })).toBeVisible();
  });
  const projectUrl = page.url();

  await test.step('Time Entries an verschiedenen Tagen erfassen', async () => {
    await page.goto('/');
    for (const entry of ENTRIES) await trackTime(page, project, entry);
  });

  await test.step('Report des Projects prüfen', async () => {
    await page.goto(projectUrl);
    await expect(page.getByRole('heading', { name: project })).toBeVisible();

    const hours = statCard(page, 'Gesamtstunden');
    await expect(hours.value).toHaveText('3:30');
    await expect(hours.row('Gerundet')).toHaveText('3:45');

    // 3:45 h × 90,00 €: the amount uses the rounded duration
    const amount = statCard(page, 'Betrag Zeit');
    await expect(amount.value).toHaveText(euro(33750));
    await expect(amount.row('Hourly Rate')).toHaveText(euro(9000));
    await expect(statCard(page, 'Zu verrechnen').value).toHaveText(euro(33750));

    const table = page.getByRole('tabpanel', { name: 'Time Entries' }).getByRole('table');
    await expect(table.getByRole('row')).toHaveCount(ENTRIES.length + 2);
    for (const entry of ENTRIES) {
      await expect(table.getByRole('row', { name: new RegExp(entry.notes) })).toContainText(
        entry.duration,
      );
    }
    await expect(table.getByRole('row', { name: /Gesamt/ })).toContainText('3:30');
  });
});
