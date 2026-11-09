import { expect, test } from '@playwright/test';
import {
  createCustomer,
  createProject,
  listTimeEntries,
  startTimer,
  uniqueName,
} from './support/api';

const HOUR_MS = 3600 * 1000;

/** `HH:MM` in Vienna, the time zone of the instance and the browser. */
function viennaTime(at: Date): string {
  return new Intl.DateTimeFormat('de', {
    timeZone: 'Europe/Vienna',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);
}

test('Vergessener Timer: Stopp fragt, wann du aufgehört hast', async ({ page }) => {
  const customer = await createCustomer(page.request, uniqueName('Kunde'), 10000);
  const name = uniqueName('Vergessen');
  const project = await createProject(page.request, customer.id, name);
  // 11 h ago on a full minute, so the entered stop time gives an exact duration
  const startedAt = new Date(Math.floor((Date.now() - 11 * HOUR_MS) / 60_000) * 60_000);
  const entry = await startTimer(page.request, project.id, startedAt);

  await page.goto('/');
  await expect(page.getByText(`Der Timer für ${name} läuft schon sehr lange.`)).toBeVisible();
  await page.getByRole('button', { name: `Timer für ${name} stoppen` }).click();

  const dialog = page.getByRole('dialog', { name: 'Wann hast du aufgehört?' });
  await expect(dialog.getByText(`seit`)).toContainText(viennaTime(startedAt));
  // Before the start is refused on the field
  await dialog.getByLabel(/Aufgehört um/).fill(viennaTime(new Date(startedAt.getTime() - HOUR_MS)));
  await dialog.getByRole('button', { name: 'Zu dieser Zeit stoppen' }).click();
  await expect(dialog.getByText(/Liegt vor dem Start des Timers/)).toBeVisible();

  await dialog.getByLabel(/Aufgehört um/).fill(viennaTime(new Date(startedAt.getTime() + HOUR_MS)));
  await dialog.getByRole('button', { name: 'Zu dieser Zeit stoppen' }).click();
  await expect(dialog).toBeHidden();

  const stopped = (await listTimeEntries(page.request)).find((e) => e.id === entry.id);
  expect(stopped).toMatchObject({ durationSeconds: 3600, runningSince: null });
});
