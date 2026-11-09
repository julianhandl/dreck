import {
  CreateCustomerSchema,
  CustomerSchema,
  UpdateCustomerSchema,
} from '@dreck/shared/api/customers';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { createRouter } from '@/http/router';
import { error, IdParamsSchema, json, jsonBody } from '@/http/schemas';
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from './customers.service';

const listRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List all customers, including archived ones',
  responses: { 200: json(z.array(CustomerSchema), 'Customers sorted by name') },
});

const createCustomerRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create a customer',
  request: { body: jsonBody(CreateCustomerSchema) },
  responses: {
    201: json(CustomerSchema, 'The created customer'),
    400: error('Invalid input'),
    409: error('name_taken'),
  },
});

const updateRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  summary: 'Change a customer',
  request: { params: IdParamsSchema, body: jsonBody(UpdateCustomerSchema) },
  responses: {
    200: json(CustomerSchema, 'The changed customer'),
    400: error('Invalid input'),
    404: error('not_found'),
    409: error('name_taken'),
  },
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Delete a customer without projects',
  request: { params: IdParamsSchema },
  responses: {
    204: { description: 'Deleted' },
    404: error('not_found'),
    409: error('has_dependencies'),
  },
});

export function createCustomersRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(listRoute, (c) => c.json(listCustomers(db), 200));
  router.openapi(createCustomerRoute, (c) => c.json(createCustomer(db, c.req.valid('json')), 201));
  router.openapi(updateRoute, (c) =>
    c.json(updateCustomer(db, c.req.valid('param').id, c.req.valid('json')), 200),
  );
  router.openapi(deleteRoute, (c) => {
    deleteCustomer(db, c.req.valid('param').id);
    return c.body(null, 204);
  });
  return router;
}
