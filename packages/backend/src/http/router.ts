import { OpenAPIHono } from '@hono/zod-openapi';
import { ApiError } from './api-error';

/** OpenAPIHono instance whose request validation fails with `400 validation_failed`. */
export function createRouter(): OpenAPIHono {
  return new OpenAPIHono({
    defaultHook: (result) => {
      if (!result.success) {
        throw new ApiError('validation_failed', 'Invalid request', {
          issues: result.error.issues,
        });
      }
    },
  });
}
