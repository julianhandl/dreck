import { SettingsSchema, UpdateSettingsSchema } from '@dreck/shared/api/settings';
import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { createRouter } from '@/http/router';
import { error, json, jsonBody } from '@/http/schemas';
import { getSettings, updateSettings } from './settings.service';

const getRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Read the instance settings',
  responses: { 200: json(SettingsSchema, 'The settings') },
});

const patchRoute = createRoute({
  method: 'patch',
  path: '/',
  summary: 'Change the instance settings',
  description: 'The currency is locked once a customer or an expense exists (409 currency_locked).',
  request: { body: jsonBody(UpdateSettingsSchema) },
  responses: {
    200: json(SettingsSchema, 'The changed settings'),
    400: error('Invalid input'),
    409: error('currency_locked'),
  },
});

export function createSettingsRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(getRoute, (c) => c.json(getSettings(db), 200));
  router.openapi(patchRoute, (c) => c.json(updateSettings(db, c.req.valid('json')), 200));
  return router;
}
