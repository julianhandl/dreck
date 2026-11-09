import {
  CreateProjectSchema,
  ProjectSchema,
  UpdateProjectSchema,
} from '@dreck/shared/api/projects';
import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import type { Db } from '@/db/db';
import { createRouter } from '@/http/router';
import { error, IdParamsSchema, json, jsonBody } from '@/http/schemas';
import { createProject, deleteProject, listProjects, updateProject } from './projects.service';

const listRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List all projects, including archived ones',
  responses: { 200: json(z.array(ProjectSchema), 'Projects sorted by name') },
});

const createProjectRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create a project',
  request: { body: jsonBody(CreateProjectSchema) },
  responses: {
    201: json(ProjectSchema, 'The created project'),
    400: error('Invalid input'),
    409: error('name_taken'),
  },
});

const updateRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  summary: 'Change a project',
  request: { params: IdParamsSchema, body: jsonBody(UpdateProjectSchema) },
  responses: {
    200: json(ProjectSchema, 'The changed project'),
    400: error('Invalid input'),
    404: error('not_found'),
    409: error('name_taken'),
  },
});

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Delete a project without time entries or expenses',
  request: { params: IdParamsSchema },
  responses: {
    204: { description: 'Deleted' },
    404: error('not_found'),
    409: error('has_dependencies'),
  },
});

export function createProjectsRouter(db: Db): OpenAPIHono {
  const router = createRouter();
  router.openapi(listRoute, (c) => c.json(listProjects(db), 200));
  router.openapi(createProjectRoute, (c) => c.json(createProject(db, c.req.valid('json')), 201));
  router.openapi(updateRoute, (c) =>
    c.json(updateProject(db, c.req.valid('param').id, c.req.valid('json')), 200),
  );
  router.openapi(deleteRoute, (c) => {
    deleteProject(db, c.req.valid('param').id);
    return c.body(null, 204);
  });
  return router;
}
