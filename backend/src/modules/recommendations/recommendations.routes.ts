import { Router } from 'express';
import { env } from '../../config/env';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Proxy requests from the frontend to the internal Python AI engine. Keeps the
// engine off the public internet while enforcing auth/RBAC here on the Node side.

router.get('/ml/recommend/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const k = req.query.k || '10';
    const response = await fetch(`${env.AI_ENGINE_URL}/ml/recommend/${userId}?k=${k}`);
    const data = await response.json();
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

router.get('/ml/similar/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const k = req.query.k || '8';
    const response = await fetch(`${env.AI_ENGINE_URL}/ml/similar/${productId}?k=${k}`);
    const data = await response.json();
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

router.post('/ml/retrain', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const response = await fetch(`${env.AI_ENGINE_URL}/ml/retrain`, { method: 'POST' });
    const data = await response.json();
    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

router.get('/ml/health', async (_req, res, next) => {
  try {
    const response = await fetch(`${env.AI_ENGINE_URL}/ml/health`);
    const data = await response.json();
    res.json({ status: 'success', data });
  } catch (err) {
    res.json({ status: 'error', message: 'AI engine unreachable' });
  }
});

export default router;
