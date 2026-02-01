import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { cartController } from './cart.controller';
import { authenticate, optionalAuthenticate } from '../auth/auth.middleware';
import { validate } from '../../utils/validate';
import { addToCartSchema, updateCartItemSchema } from './cart.validation';

const router = Router();

// Identify the shopper: logged-in user (if a valid session cookie is present) or
// a persistent guest. A guest token is minted on first use so guests get a cart.
router.use(optionalAuthenticate);
router.use((req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user && !req.cookies?.guestToken) {
    const guestToken = crypto.randomBytes(24).toString('hex');
    res.cookie('guestToken', guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/cart',
    });
    // Make it visible to controllers within this same request.
    (req.cookies ||= {}).guestToken = guestToken;
  }
  next();
});

router.get('/', cartController.getCart);
router.post('/items', validate(addToCartSchema), cartController.addToCart);
router.put('/items/:itemId', validate(updateCartItemSchema), cartController.updateCartItem);
router.delete('/items/:itemId', cartController.removeFromCart);
router.delete('/', cartController.clearCart);
router.post('/merge', authenticate, cartController.mergeGuestCart);

export default router;
