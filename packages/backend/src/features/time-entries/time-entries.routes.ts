import { DateRangeFilterSchema } from '@dreck/shared/api/common';
import {
  CreateTimeEntrySchema,
  type TimeEntry as TimeEntryResponse,
  TimeEntrySchema,
  UpdateTimeEntrySchema,
} from '@dreck/shared/api/time-entries';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { createRouter } from '@/http/router';
import { error, IdParamsSchema, json, jsonBody } from '@/http/schemas';
import {
  createTimeEntry,
  deleteTimeEntry,
  listTimeEntries,
  updateTimeEntry,
} from './time-entries.service';
import type { TimeEntry } from './time-entries.table';

/** API shape of a Time Entry: `runningSince` as ISO 8601 in UTC. */
export function toTimeEntryResponse(entry: TimeEntry): TimeEntryResponse {
  const { runningSince } = entry;
  return {
    ...entry,
    runningSince: runningSince === null ? null : new Date(runningSince * 1000).toISOString(),
  };
}

const listRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List time entries',
  description: 'Sorted by date descending, within a day by creation. Filters combine with AND.',
  request: { query: DateRangeFilterSchema },
  responses: {
    200: json(z.array(TimeEntrySchema), 'Time entries'),
    400: error('Invalid filter'),
  },
});

const createTimeEntryRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create a stopped time entry',
  description: 'A running time entry only comes from the timer.',
  request: { body: jsonBody(CreateTimeEntrySchema) },
  responses: {
    201: json(TimeEntrySchema, 'The created time entry'),
    400: error('Invalid input'),
  },
});

const updateRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  summary: 'Change a time entry',
  request: { params: IdParamsSchema, body: jsonBody(UpdateTimeEntrySchema) },
  responses: {
    200: json(TimeEntrySchema, 'The changed time entry'),
    400: error('Invalid input'),
    404: error('not_found'),
  },
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Delete a time entry',
  request: { params: IdParamsSchema },
  responses: { 204: { description: 'Deleted' }, 404: error('not_found') },
});

export function createTimeEntriesRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(listRoute, (c) =>
    c.json(listTimeEntries(db, c.req.valid('query')).map(toTimeEntryResponse), 200),
  );
  router.openapi(createTimeEntryRoute, (c) =>
    c.json(toTimeEntryResponse(createTimeEntry(db, c.req.valid('json'))), 201),
  );
  router.openapi(updateRoute, (c) =>
    c.json(
      toTimeEntryResponse(updateTimeEntry(db, c.req.valid('param').id, c.req.valid('json'))),
      200,
    ),
  );
  router.openapi(deleteRoute, (c) => {
    deleteTimeEntry(db, c.req.valid('param').id);
    return c.body(null, 204);
  });
  return router;
}
