import { expect, test } from 'bun:test';
import { projectHue } from './project-color';

test('derives a stable hue per Project, far apart for consecutive IDs', () => {
  expect(projectHue(1)).toBe(138);
  expect(projectHue(1)).toBe(projectHue(1));
  const hues = [1, 2, 3, 4, 5].map(projectHue);
  for (const hue of hues) expect(hue).toBeGreaterThanOrEqual(0);
  for (const hue of hues) expect(hue).toBeLessThan(360);
  expect(new Set(hues).size).toBe(hues.length);
});
