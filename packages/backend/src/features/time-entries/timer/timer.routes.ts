import {
  StartTimerResultSchema,
  StartTimerSchema,
  StopTimerSchema,
  TimeEntrySchema,
} from '@dreck/shared/api/time-entries';
import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { toTimeEntryResponse } from '@/features/time-entries/time-entries.routes';
import { createRouter } from '@/http/router';
import { error, json, jsonBody } from '@/http/schemas';
import { getRunningTimeEntry, startTimer, stopTimer } from './timer.service';

const getRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'The running time entry or null',
  responses: { 200: json(TimeEntrySchema.nullable(), 'The running time entry or null') },
});

const startRoute = createRoute({
  method: 'post',
  path: '/start',
  summary: 'Start a new timer or continue a time entry of today',
  description: 'Stops the running timer in the same transaction and returns it as `stopped`.',
  request: { body: jsonBody(StartTimerSchema) },
  responses: {
    200: json(StartTimerResultSchema, 'Started and stopped time entry'),
    400: error('Invalid input, not a time entry of today, or at before the running start'),
  },
});

const stopRoute = createRoute({
  method: 'post',
  path: '/stop',
  summary: 'Stop the running timer',
  request: {
    body: {
      content: { 'application/json': { schema: StopTimerSchema } },
      required: false,
    },
  },
  responses: {
    200: json(TimeEntrySchema, 'The stopped time entry'),
    400: error('Invalid input or at before the running start'),
    409: error('no_running_timer'),
  },
});

export function createTimerRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(getRoute, (c) => {
    const running = getRunningTimeEntry(db);
    return c.json(running ? toTimeEntryResponse(running) : null, 200);
  });
  router.openapi(startRoute, (c) => {
    const { started, stopped } = startTimer(db, c.req.valid('json'));
    return c.json(
      {
        started: toTimeEntryResponse(started),
        stopped: stopped ? toTimeEntryResponse(stopped) : null,
      },
      200,
    );
  });
  router.openapi(stopRoute, (c) =>
    c.json(toTimeEntryResponse(stopTimer(db, c.req.valid('json').at)), 200),
  );
  return router;
}
