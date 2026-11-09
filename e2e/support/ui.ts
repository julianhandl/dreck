import type { Locator, Page } from '@playwright/test';

/** Key figure card ("Gesamtstunden", "Betrag Zeit", …) of the Project screen or the Report. */
export function statCard(
  page: Page,
  title: string,
): { value: Locator; row: (label: string) => Locator } {
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  return {
    value: card.locator('p').first(),
    row: (label) => card.locator('div').filter({ hasText: label }).getByRole('definition'),
  };
}
