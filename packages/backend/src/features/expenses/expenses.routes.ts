import { DateRangeFilterSchema } from '@dreck/shared/api/common';
import {
  CreateExpenseSchema,
  ExpenseSchema,
  UpdateExpenseSchema,
} from '@dreck/shared/api/expenses';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { createRouter } from '@/http/router';
import { error, IdParamsSchema, json, jsonBody } from '@/http/schemas';
import { createExpense, deleteExpense, listExpenses, updateExpense } from './expenses.service';

const listRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List expenses',
  description: 'Sorted by date descending. Filters combine with AND.',
  request: { query: DateRangeFilterSchema },
  responses: {
    200: json(z.array(ExpenseSchema), 'Expenses'),
    400: error('Invalid filter'),
  },
});

const createExpenseRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create an expense',
  request: { body: jsonBody(CreateExpenseSchema) },
  responses: {
    201: json(ExpenseSchema, 'The created expense'),
    400: error('Invalid input'),
  },
});

const updateRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  summary: 'Change an expense',
  request: {
    params: IdParamsSchema,
    body: jsonBody(UpdateExpenseSchema),
  },
  responses: {
    200: json(ExpenseSchema, 'The changed expense'),
    400: error('Invalid input'),
    404: error('not_found'),
  },
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Delete an expense',
  request: { params: IdParamsSchema },
  responses: { 204: { description: 'Deleted' }, 404: error('not_found') },
});

export function createExpensesRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(listRoute, (c) => c.json(listExpenses(db, c.req.valid('query')), 200));
  router.openapi(createExpenseRoute, (c) => c.json(createExpense(db, c.req.valid('json')), 201));
  router.openapi(updateRoute, (c) =>
    c.json(updateExpense(db, c.req.valid('param').id, c.req.valid('json')), 200),
  );
  router.openapi(deleteRoute, (c) => {
    deleteExpense(db, c.req.valid('param').id);
    return c.body(null, 204);
  });
  return router;
}
