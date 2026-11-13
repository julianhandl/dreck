import {
  CreateInvoiceSchema,
  InvoiceSchema,
  UpdateInvoiceSchema,
} from '@dreck/shared/api/invoices';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { createRouter } from '@/http/router';
import { error, IdParamsSchema, json, jsonBody } from '@/http/schemas';
import { createInvoice, deleteInvoice, listInvoices, updateInvoice } from './invoices.service';

const listRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List invoices',
  description: 'With items and totals, sorted by issue date descending.',
  responses: { 200: json(z.array(InvoiceSchema), 'Invoices') },
});

const createInvoiceRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create a draft invoice',
  description:
    'With `import` the uninvoiced Time Entries and Billable Expenses of the Customer become items; they are locked while their item exists.',
  request: { body: jsonBody(CreateInvoiceSchema) },
  responses: {
    201: json(InvoiceSchema, 'The created invoice'),
    400: error('Invalid input'),
    409: error('number_taken'),
  },
});

const updateRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  summary: 'Change an invoice',
  description:
    'Content changes only while it is a draft or in the same call that sets `sentOn` and `paidOn` to null (409 invoice_locked).',
  request: { params: IdParamsSchema, body: jsonBody(UpdateInvoiceSchema) },
  responses: {
    200: json(InvoiceSchema, 'The changed invoice'),
    400: error('Invalid input'),
    404: error('not_found'),
    409: error('invoice_locked or number_taken'),
  },
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Delete a draft invoice',
  description: 'Releases its Time Entries and Expenses.',
  request: { params: IdParamsSchema },
  responses: {
    204: { description: 'Deleted' },
    404: error('not_found'),
    409: error('invoice_locked'),
  },
});

export function createInvoicesRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(listRoute, (c) => c.json(listInvoices(db), 200));
  router.openapi(createInvoiceRoute, (c) => c.json(createInvoice(db, c.req.valid('json')), 201));
  router.openapi(updateRoute, (c) =>
    c.json(updateInvoice(db, c.req.valid('param').id, c.req.valid('json')), 200),
  );
  router.openapi(deleteRoute, (c) => {
    deleteInvoice(db, c.req.valid('param').id);
    return c.body(null, 204);
  });
  return router;
}
