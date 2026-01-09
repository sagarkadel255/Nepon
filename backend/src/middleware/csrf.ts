import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * CSRF protection (double-submit cookie pattern).
 *
 * A token cookie is set on every response; state-changing requests must echo
 * it back in the X-CSRF-Token header. SameSite=Strict stops cross-origin
 * scripts from reading or sending the cookie, so forged requests lack the
 * correct header.
 */

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Bypass in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Exempt payment webhooks
  if (req.originalUrl.includes('/webhook')) {
    return next();
  }

  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,        // Readable by JS so the frontend can send it as a header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER] as string | undefined;
  if (!headerToken || headerToken !== token) {
    res.status(403).json({
      status: 'error',
      message: 'CSRF token missing or invalid',
    });
    return;
  }

  next();
}
