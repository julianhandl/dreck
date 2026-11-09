import { createHash, timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { ApiError } from '@/http/api-error';
import type { LoginThrottle } from './login-throttle';
import { hasValidSession } from './session-cookie';

/** Constant-time comparison of a presented secret with the instance secret. */
export function matchesSecret(presented: string, secret: string): boolean {
  const hash = (value: string): Buffer => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(presented), hash(secret));
}

/** Throws `429 rate_limited` with `Retry-After` while the throttle blocks. */
export function assertNotThrottled(throttle: LoginThrottle): void {
  const retryAfter = throttle.retryAfterSeconds();
  if (retryAfter > 0) {
    throw new ApiError(
      'rate_limited',
      'Too many failed attempts',
      { retryAfterSeconds: retryAfter },
      { 'Retry-After': String(retryAfter) },
    );
  }
}

/** Accepts `Authorization: Bearer <secret>` or a valid session cookie. */
export function requireAuth(secret: string, throttle: LoginThrottle): MiddlewareHandler {
  return async (c, next) => {
    const authorization = c.req.header('authorization');
    if (authorization !== undefined) {
      assertNotThrottled(throttle);
      const [scheme, token] = authorization.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token || !matchesSecret(token, secret)) {
        throttle.recordFailure();
        throw new ApiError('unauthorized', 'Invalid bearer token');
      }
      return next();
    }
    if (await hasValidSession(c, secret)) return next();
    throw new ApiError('unauthorized', 'Authentication required');
  };
}
