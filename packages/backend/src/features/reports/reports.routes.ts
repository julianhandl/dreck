import { ReportQuerySchema, ReportSchema } from '@dreck/shared/api/reports';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { getSettings } from '@/features/settings/settings.service';
import { createRouter } from '@/http/router';
import { error } from '@/http/schemas';
import { reportCsv } from './csv/report-csv';
import { buildReport, loadReportLines } from './reports.service';

const reportRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Report for a period, grouped by customer and project',
  description:
    'Archived customers and projects are included, a running timer counts until now. ' +
    'Amount per time entry = round(hourlyRateMinor × rounded seconds / 3600); sums add these.',
  request: { query: ReportQuerySchema },
  responses: {
    200: {
      content: {
        'application/json': { schema: ReportSchema },
        'text/csv': {
          schema: z.string().openapi({ description: 'One row per time entry and expense' }),
        },
      },
      description: 'The report',
    },
    400: error('Invalid filter'),
  },
});

export function createReportsRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(reportRoute, (c) => {
    const { format, ...filter } = c.req.valid('query');
    const wantsCsv = format === 'csv' || (!format && c.req.header('accept') === 'text/csv');
    if (!wantsCsv) return c.json(buildReport(db, filter), 200);

    const settings = getSettings(db);
    return c.body(reportCsv(loadReportLines(db, filter, settings), settings), 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dreck-report_${filter.from}_${filter.to}.csv"`,
    });
  });
  return router;
}
