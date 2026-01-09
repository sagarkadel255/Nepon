import helmet from 'helmet';

/**
 * Helmet configuration without CSP — CSP is generated per-request with a nonce
 * by the Next.js edge middleware (frontend/middleware.ts); a duplicate backend
 * policy would conflict with the nonce-based policy already sent from the edge
 * layer.
 */
const isProduction = process.env.NODE_ENV === 'production';

export const helmetConfig = helmet({
  crossOriginEmbedderPolicy: false,
  ...(isProduction
    ? {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      }
    : {}),
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  frameguard: {
    action: 'deny',
  },
});
