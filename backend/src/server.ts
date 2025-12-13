import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { env } from './config/env';
import { connectDB } from './config/database';
import { csrfProtection } from './middleware/csrf';
import { helmetConfig } from './middleware/security-headers';
import { sanitizeInput } from './middleware/sanitize';
import { ipBlocklistMiddleware } from './middleware/ipBlocklist';
import { SecurityEvent } from './models/SecurityEvent';
import { logger } from './utils/logger';

import authRoutes from './modules/auth/auth.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import cartRoutes from './modules/cart/cart.routes';
import checkoutRoutes from './modules/checkout/checkout.routes';
import ordersRoutes from './modules/orders/orders.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import adminRoutes from './modules/admin/admin.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import recommendationsRoutes from './modules/recommendations/recommendations.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import interactionsRoutes from './modules/interactions/interactions.routes';
import securityRoutes from './modules/security/security.routes';

const app = express();

// Trust the first proxy hop (Nginx/load-balancer) so req.ip is the real client IP
app.set('trust proxy', 1);

// Security headers (Helmet)
app.use(helmetConfig);

// CORS
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// IP blocklist — checked before any other processing
app.use(ipBlocklistMiddleware);

// Request correlation ID — aids log tracing and incident response
app.use((_req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', requestId);
  (_req as any).requestId = requestId;
  next();
});

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
  handler: async (req: Request, res: Response) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    logger.warn('Global rate limit exceeded', { ip, path: req.path });
    try {
      await SecurityEvent.create({
        userId: (req as any).user?.sub || null,
        type: 'rate_limit_trip',
        ip,
        userAgent: req.headers['user-agent'] || '',
        metadata: { path: req.path, method: req.method },
      });
    } catch { /* non-blocking — never let logging kill a response */ }
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later.',
    });
  },
});
app.use('/api', globalLimiter);

// Body parsing — the webhook route must receive raw bytes for signature verification
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Input sanitization (XSS defence-in-depth)
app.use(sanitizeInput);

// CSRF protection
app.use(csrfProtection);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', recommendationsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/security', securityRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      message: err.message,
      path: req.path,
      requestId: (req as any).requestId,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message: statusCode >= 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
    requestId: (req as any).requestId,
    ...(env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
});

// Bootstrap
const start = async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    logger.info(`Server running`, { port: env.PORT, env: env.NODE_ENV });
  });
};

start();

export default app;
