import { OpenAPIHono } from '@hono/zod-openapi';
import { version } from '@root/package.json';
import { serveStatic } from 'hono/bun';
import { csrf } from 'hono/csrf';
import type { Db } from '@/db/db';
import { requireAuth } from '@/features/auth/auth.middleware';
import { createAuthRouter } from '@/features/auth/auth.routes';
import { createLoginThrottle } from '@/features/auth/login-throttle';
import { createBackupRouter } from '@/features/backup/backup.routes';
import { createCustomersRouter } from '@/features/customers/customers.routes';
import { createExpensesRouter } from '@/features/expenses/expenses.routes';
import { createInvoicesRouter } from '@/features/invoices/invoices.routes';
import { createProjectsRouter } from '@/features/projects/projects.routes';
import { createReportsRouter } from '@/features/reports/reports.routes';
import { createSettingsRouter } from '@/features/settings/settings.routes';
import { createTimeEntriesRouter } from '@/features/time-entries/time-entries.routes';
import { createTimerRouter } from '@/features/time-entries/timer/timer.routes';
import { handleError } from '@/http/error-handler';
import { createRouter } from '@/http/router';

type AppConfig = {
  db: Db;
  secret: string;
  /** Directory for temporary backup files. */
  dataDir: string;
  /** Built SPA; without it only the API is served. */
  staticDir?: string;
};

const PUBLIC_PATHS = new Set(['/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/openapi.json']);

/** The whole HTTP app: API under `/api/v1`, health check, and the SPA. */
export function createApp({ db, secret, dataDir, staticDir }: AppConfig): OpenAPIHono {
  const app = new OpenAPIHono();
  app.onError(handleError);
  app.get('/api/health', (c) => c.json({ ok: true }));

  // One brake for failed passwords and Bearer tokens
  const throttle = createLoginThrottle();
  const auth = requireAuth(secret, throttle);
  const api = createRouter();
  // CSRF only concerns the session cookie; Bearer clients (CLI) send no Origin
  const checkOrigin = csrf();
  api.use((c, next) => (c.req.header('authorization') ? next() : checkOrigin(c, next)));
  api.use((c, next) => (PUBLIC_PATHS.has(c.req.path) ? next() : auth(c, next)));

  api.route('/auth', createAuthRouter(secret, throttle));
  api.route('/settings', createSettingsRouter(db));
  api.route('/customers', createCustomersRouter(db));
  api.route('/projects', createProjectsRouter(db));
  api.route('/time-entries', createTimeEntriesRouter(db));
  api.route('/timer', createTimerRouter(db));
  api.route('/expenses', createExpensesRouter(db));
  api.route('/reports', createReportsRouter(db));
  api.route('/invoices', createInvoicesRouter(db));
  api.route('/backup', createBackupRouter(db, dataDir));

  api.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    description: 'The instance secret',
  });
  api.openAPIRegistry.registerComponent('securitySchemes', 'Session', {
    type: 'apiKey',
    in: 'cookie',
    name: 'dreck_session',
  });
  api.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Dreck API', version },
    servers: [{ url: '/api/v1' }],
    security: [{ Bearer: [] }, { Session: [] }],
  });

  app.route('/api/v1', api);
  app.all('/api/*', (c) => c.json({ code: 'not_found', message: 'Not found' }, 404));

  if (staticDir) {
    app.use('*', serveStatic({ root: staticDir }));
    app.get('*', serveStatic({ root: staticDir, path: 'index.html' }));
  }
  return app;
}
