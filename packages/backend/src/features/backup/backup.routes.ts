import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { dateInTimeZone } from '@dreck/shared/time';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import type { Db } from '@/db/db';
import { getSettings } from '@/features/settings/settings.service';
import { createRouter } from '@/http/router';

const backupRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Download a consistent snapshot of the SQLite database',
  responses: {
    200: {
      content: { 'application/vnd.sqlite3': { schema: z.string().openapi({ format: 'binary' }) } },
      description: 'The database file',
    },
  },
});

/** `GET /backup`: snapshot via `VACUUM INTO` into a temp file under the data dir, deleted after reading. */
export function createBackupRouter(db: Db, dataDir: string): OpenAPIHono {
  const router = createRouter();
  router.openapi(backupRoute, async (c) => {
    const tempFile = join(dataDir, `.backup-download-${crypto.randomUUID()}.db`);
    try {
      db.run(sql`VACUUM INTO ${tempFile}`);
      const bytes = await Bun.file(tempFile).bytes();
      const date = dateInTimeZone(Date.now(), getSettings(db).timezone);
      return c.body(bytes, 200, {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="dreck-backup_${date}.db"`,
      });
    } finally {
      await rm(tempFile, { force: true });
    }
  });
  return router;
}
