import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import { E2E_SECRET } from './e2e/support/secret';

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;
// Fresh seeded database per run: the screenshots run against a year of realistic test data
const DATA_DIR = join(tmpdir(), 'dreck-docs');

/** Generates the screenshots in docs/img: `bun run docs:screenshots`. */
export default defineConfig({
  testDir: 'e2e',
  testMatch: /.*\.shots\.ts/,
  workers: 1,
  timeout: 120_000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: BASE_URL, actionTimeout: 10_000 },
  webServer: {
    command: [
      'bun run build',
      `rm -rf ${DATA_DIR}`,
      // From the backend package, so its tsconfig resolves the `@/` alias
      `(cd packages/backend && bun src/seed/seed.ts --data-dir ${DATA_DIR})`,
      `bun packages/backend/dist/server.js --data-dir ${DATA_DIR} --port ${PORT}`,
    ].join(' && '),
    url: `${BASE_URL}/api/health`,
    env: { DRECK_SECRET: E2E_SECRET },
    timeout: 300_000,
    // DOCS_REUSE=1 for a server started by hand while developing the scenes
    reuseExistingServer: Boolean(process.env.DOCS_REUSE),
  },
});
