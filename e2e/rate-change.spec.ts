import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  createCustomer,
  createProject,
  createTimeEntry,
  overrideRate,
  uniqueName,
} from './support/api';
import { euro } from './support/format';
import { statCard } from './support/ui';

// Full hours only, so Rounding (15 minutes) does not change the amounts

/** Opens "Project bearbeiten", enters the new rate and saves; returns the rate question. */
async function changeProjectRate(page: Page, projectId: number, rate: string): Promise<Locator> {
  await page.goto(`/projects/${projectId}/edit`);
  await page.getByLabel('Hourly Rate', { exact: true }).fill(rate);
  await page.getByRole('button', { name: 'Project aktualisieren' }).click();
  const dialog = page.getByRole('dialog', { name: 'Bestehende Time Entries übernehmen?' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectProjectAmount(
  page: Page,
  projectId: number,
  amountMinor: number,
): Promise<void> {
  await page.goto(`/projects/${projectId}`);
  await expect(statCard(page, 'Betrag Zeit').value).toHaveText(euro(amountMinor));
}

/** Customer at 100,00 € with one Project that took over the rate. */
async function projectAt100(page: Page): Promise<number> {
  const customer = await createCustomer(page.request, uniqueName('Kunde'), 10000);
  const project = await createProject(page.request, customer.id, uniqueName('Project'));
  return project.id;
}

test.describe('Hourly Rate ändern', () => {
  test('Project: nur neue Time Entries übernehmen die neue Rate', async ({ page }) => {
    const projectId = await projectAt100(page);
    await createTimeEntry(page.request, projectId, '2026-02-02', 1);
    await createTimeEntry(page.request, projectId, '2026-02-03', 1);

    const dialog = await changeProjectRate(page, projectId, '120,00');
    await expect(dialog.getByText('2 Time Entries, 2:00 Stunden')).toBeVisible();
    await expect(dialog.getByText(`${euro(20000)} → ${euro(24000)}`)).toBeVisible();
    await dialog.getByRole('button', { name: 'Nur für neue Time Entries' }).click();

    await expect(page.getByText(`${euro(12000)} pro Stunde`)).toBeVisible();
    await createTimeEntry(page.request, projectId, '2026-02-04', 1);
    // 2 × 100,00 € (unchanged) + 1 × 120,00 € (new)
    await expectProjectAmount(page, projectId, 32000);
  });

  test('Project: Zeitraum übernimmt, von Hand korrigierte bleiben', async ({ page }) => {
    const projectId = await projectAt100(page);
    await createTimeEntry(page.request, projectId, '2026-02-02', 1);
    await createTimeEntry(page.request, projectId, '2026-02-10', 1);
    const corrected = await createTimeEntry(page.request, projectId, '2026-02-11', 1);
    await overrideRate(page.request, corrected.id, 15000);

    const dialog = await changeProjectRate(page, projectId, '120,00');
    // Corrected by hand counts separately, also without a range
    await expect(dialog.getByText('2 Time Entries, 2:00 Stunden')).toBeVisible();
    await dialog.getByLabel('Von').fill('2026-02-09');
    // 02-02 is out of range, 02-11 was corrected by hand
    await expect(dialog.getByText('1 Time Entries, 1:00 Stunden')).toBeVisible();
    await expect(dialog.getByText(`${euro(10000)} → ${euro(12000)}`)).toBeVisible();
    await expect(
      dialog.getByText('1 von Hand korrigierte Time Entries bleiben unverändert.'),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();

    // 100,00 € (out of range) + 120,00 € (taken over) + 150,00 € (corrected by hand)
    await expectProjectAmount(page, projectId, 37000);
  });

  test('Project: "Auch überschreiben" ersetzt von Hand korrigierte', async ({ page }) => {
    const projectId = await projectAt100(page);
    await createTimeEntry(page.request, projectId, '2026-02-02', 1);
    const corrected = await createTimeEntry(page.request, projectId, '2026-02-03', 1);
    await overrideRate(page.request, corrected.id, 15000);

    const dialog = await changeProjectRate(page, projectId, '120,00');
    await expect(dialog.getByText('1 Time Entries, 1:00 Stunden')).toBeVisible();
    await dialog.getByRole('button', { name: 'Auch überschreiben' }).click();
    await expect(
      dialog.getByText('1 von Hand korrigierte Time Entries werden überschrieben.'),
    ).toBeVisible();
    await expect(dialog.getByText(`${euro(25000)} → ${euro(24000)}`)).toBeVisible();
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();

    await expectProjectAmount(page, projectId, 24000);
  });

  test('Customer: Projects mit der alten Rate übernehmen sie samt Time Entries', async ({
    page,
  }) => {
    const customer = await createCustomer(page.request, uniqueName('Kunde'), 10000);
    const inherited = uniqueName('Erbt');
    const own = uniqueName('Eigen');
    const inheritedProject = await createProject(page.request, customer.id, inherited);
    const ownProject = await createProject(page.request, customer.id, own, 15000);
    await createTimeEntry(page.request, inheritedProject.id, '2026-02-02', 1);
    await createTimeEntry(page.request, ownProject.id, '2026-02-02', 1);

    await page.goto(`/projects/customers/${customer.id}/edit`);
    await page.getByLabel('Hourly Rate', { exact: true }).fill('110,00');
    await page.getByRole('button', { name: 'Customer aktualisieren' }).click();
    const dialog = page.getByRole('dialog', { name: 'Bestehende Time Entries übernehmen?' });

    // Preselected only where the Project still had the old Customer rate
    await expect(
      dialog.getByRole('checkbox', { name: `${inherited} (${euro(10000)})` }),
    ).toBeChecked();
    await expect(
      dialog.getByRole('checkbox', { name: `${own} (${euro(15000)})` }),
    ).not.toBeChecked();
    await expect(dialog.getByText('1 Time Entries, 1:00 Stunden')).toBeVisible();
    await expect(dialog.getByText(`${euro(10000)} → ${euro(11000)}`)).toBeVisible();
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(page).toHaveURL(/\/projects$/);

    await expectProjectAmount(page, inheritedProject.id, 11000);
    await expect(page.getByText(`${euro(11000)} pro Stunde`)).toBeVisible();
    await expectProjectAmount(page, ownProject.id, 15000);
    await expect(page.getByText(`${euro(15000)} pro Stunde`)).toBeVisible();
  });

  test('Customer: "Nur für neue" stellt Projects um, bestehende Time Entries bleiben', async ({
    page,
  }) => {
    const customer = await createCustomer(page.request, uniqueName('Kunde'), 10000);
    const project = await createProject(page.request, customer.id, uniqueName('Project'));
    await createTimeEntry(page.request, project.id, '2026-02-02', 1);

    await page.goto(`/projects/customers/${customer.id}/edit`);
    await page.getByLabel('Hourly Rate', { exact: true }).fill('110,00');
    await page.getByRole('button', { name: 'Customer aktualisieren' }).click();
    const dialog = page.getByRole('dialog', { name: 'Bestehende Time Entries übernehmen?' });
    await dialog.getByRole('button', { name: 'Nur für neue Time Entries' }).click();
    await expect(page).toHaveURL(/\/projects$/);

    // The Project has the new rate, its existing Time Entry keeps the old one
    await expectProjectAmount(page, project.id, 10000);
    await expect(page.getByText(`${euro(11000)} pro Stunde`)).toBeVisible();
    await createTimeEntry(page.request, project.id, '2026-02-03', 1);
    await expectProjectAmount(page, project.id, 21000);
  });

  test('Time Entry: Rate im Dialog korrigiert, bleibt bei Änderung am Project', async ({
    page,
  }) => {
    const projectId = await projectAt100(page);
    await createTimeEntry(page.request, projectId, '2026-02-02', 1);

    await page.goto('/?date=2026-02-02');
    await page
      .getByRole('button', { name: /^Time Entry für .* bearbeiten$/ })
      .last()
      .click();
    const edit = page.getByRole('dialog', { name: 'Time Entry bearbeiten' });
    // Folded away by default
    await expect(edit.getByLabel('Hourly Rate', { exact: true })).toBeHidden();
    await edit.getByText(/^Hourly Rate:/).click();
    await edit.getByLabel('Hourly Rate', { exact: true }).fill('150,00');
    await edit.getByRole('button', { name: 'Eintrag aktualisieren' }).click();
    await expect(edit).toBeHidden();

    // The summary marks the correction
    await page
      .getByRole('button', { name: /^Time Entry für .* bearbeiten$/ })
      .last()
      .click();
    await expect(edit.getByText(/von Hand korrigiert/).first()).toBeVisible();
    await edit.getByRole('button', { name: 'Abbrechen' }).click();

    const dialog = await changeProjectRate(page, projectId, '120,00');
    await expect(
      dialog.getByText('1 von Hand korrigierte Time Entries bleiben unverändert.'),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    await expectProjectAmount(page, projectId, 15000);
  });
});
