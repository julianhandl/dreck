import {
  CreateEstimateSchema,
  EstimateSchema,
  UpdateEstimateSchema,
} from '@dreck/shared/api/estimates';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { createRouter } from '@/http/router';
import { error, IdParamsSchema, json, jsonBody } from '@/http/schemas';
import { createEstimate, deleteEstimate, listEstimates, updateEstimate } from './estimates.service';

const listRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List estimates',
  description: 'With items and totals, sorted by issue date descending.',
  responses: { 200: json(z.array(EstimateSchema), 'Estimates') },
});

const createEstimateRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create a draft estimate',
  request: { body: jsonBody(CreateEstimateSchema) },
  responses: {
    201: json(EstimateSchema, 'The created estimate'),
    400: error('Invalid input'),
    409: error('number_taken'),
  },
});

const updateRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  summary: 'Change an estimate',
  description:
    'Content changes only while it is a draft or in the same call that sets `sentOn`, `acceptedOn` and `declinedOn` to null (409 estimate_locked).',
  request: { params: IdParamsSchema, body: jsonBody(UpdateEstimateSchema) },
  responses: {
    200: json(EstimateSchema, 'The changed estimate'),
    400: error('Invalid input'),
    404: error('not_found'),
    409: error('estimate_locked or number_taken'),
  },
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Delete an estimate',
  description: 'In any status, with its items.',
  request: { params: IdParamsSchema },
  responses: {
    204: { description: 'Deleted' },
    404: error('not_found'),
  },
});

export function createEstimatesRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(listRoute, (c) => c.json(listEstimates(db), 200));
  router.openapi(createEstimateRoute, (c) => c.json(createEstimate(db, c.req.valid('json')), 201));
  router.openapi(updateRoute, (c) =>
    c.json(updateEstimate(db, c.req.valid('param').id, c.req.valid('json')), 200),
  );
  router.openapi(deleteRoute, (c) => {
    deleteEstimate(db, c.req.valid('param').id);
    return c.body(null, 204);
  });
  return router;
}
