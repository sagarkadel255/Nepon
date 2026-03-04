import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { AIInteraction } from '../../models/AIInteraction';
import { AppError } from '../../utils/AppError';

const router = Router();

// Records a user interaction event (view, click, search) for the AI
// recommendation engine's implicit feedback pipeline.
router.post('/track', authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) throw AppError.unauthorized('Not authenticated');

    const { productId, type, metadata } = req.body;

    if (!productId || !type) {
      throw AppError.badRequest('productId and type are required');
    }

    if (!['view', 'click', 'search'].includes(type)) {
      throw AppError.badRequest('type must be one of: view, click, search');
    }

    await AIInteraction.create({
      userId,
      productId,
      type,
      metadata: metadata || {},
    });

    res.status(201).json({
      status: 'success',
      message: 'Interaction recorded',
    });
  } catch (err) {
    next(err);
  }
});

// Recent interaction history for the authenticated user (debugging/analytics).
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) throw AppError.unauthorized('Not authenticated');

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const interactions = await AIInteraction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('productId', 'title slug images');

    res.json({
      status: 'success',
      data: { interactions, count: interactions.length },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
