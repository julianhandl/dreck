import { createHmac } from 'node:crypto';
import type { Context } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';

const COOKIE = 'dreck_session';
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/** Signing key derived from the secret, so a new secret invalidates every session. */
function signingKey(secret: string): string {
  return createHmac('sha256', secret).update('dreck-session').digest('hex');
}

function cookieOptions(c: Context): {
  path: string;
  httpOnly: true;
  sameSite: 'Strict';
  secure: boolean;
} {
  const host = new URL(c.req.url).hostname;
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'Strict',
    secure: host !== 'localhost' && host !== '127.0.0.1',
  };
}

/** Sets the signed session cookie, valid for 90 days, without any server-side state. */
export async function startSession(c: Context, secret: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  await setSignedCookie(c, COOKIE, String(expiresAt), signingKey(secret), {
    ...cookieOptions(c),
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function hasValidSession(c: Context, secret: string): Promise<boolean> {
  const expiresAt = await getSignedCookie(c, signingKey(secret), COOKIE);
  return typeof expiresAt === 'string' && Number(expiresAt) > Date.now() / 1000;
}

export function endSession(c: Context): void {
  deleteCookie(c, COOKIE, cookieOptions(c));
}
