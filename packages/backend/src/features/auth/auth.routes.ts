import { LoginSchema } from '@dreck/shared/api/auth';
import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { ApiError } from '@/http/api-error';
import { createRouter } from '@/http/router';
import { error, jsonBody } from '@/http/schemas';
import { assertNotThrottled, matchesSecret } from './auth.middleware';
import type { LoginThrottle } from './login-throttle';
import { endSession, startSession } from './session-cookie';

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  summary: 'Log in with the instance secret and receive the session cookie',
  security: [],
  request: { body: jsonBody(LoginSchema) },
  responses: {
    204: { description: 'Logged in, session cookie set' },
    401: error('unauthorized'),
    429: error('rate_limited, see Retry-After'),
  },
});

const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  summary: 'Delete the session cookie',
  security: [],
  responses: { 204: { description: 'Logged out' } },
});

export function createAuthRouter(secret: string, throttle: LoginThrottle): OpenAPIHono {
  const router = createRouter();
  router.openapi(loginRoute, async (c) => {
    assertNotThrottled(throttle);
    if (!matchesSecret(c.req.valid('json').password, secret)) {
      throttle.recordFailure();
      throw new ApiError('unauthorized', 'Wrong password');
    }
    await startSession(c, secret);
    return c.body(null, 204);
  });
  router.openapi(logoutRoute, (c) => {
    endSession(c);
    return c.body(null, 204);
  });
  return router;
}
