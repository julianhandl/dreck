import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { E2E_SECRET } from './e2e/support/secret';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
// Fresh database per run; the server deletes nothing itself
const DATA_DIR = join(tmpdir(), 'dreck-e2e');
const AUTH_FILE = 'e2e/.auth/session.json';
// Delay per action in ms, e.g. for `bun run test:e2e:headed`
const SLOW_MO = Number(process.env.E2E_SLOW_MO ?? 0);

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  // Slowed down runs need more time per test
  timeout: SLOW_MO > 0 ? 120_000 : 30_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  // No retries: flakiness stays visible
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    // Before the login the app speaks the browser language; afterwards the instance language (de)
    locale: 'de-DE',
    timezoneId: 'Europe/Vienna',
    trace: 'retain-on-failure',
    launchOptions: { slowMo: SLOW_MO },
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: `bun run build && rm -rf ${DATA_DIR} && bun packages/backend/dist/server.js --data-dir ${DATA_DIR} --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    env: { DRECK_SECRET: E2E_SECRET },
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
