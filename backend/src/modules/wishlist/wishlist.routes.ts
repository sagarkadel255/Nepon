import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as wishlistController from './wishlist.controller';

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

router.get('/', wishlistController.getWishlist);

router.post('/items', wishlistController.addItem);

router.delete('/items/:productId', wishlistController.removeItem);

router.delete('/', wishlistController.clearWishlist);

export default router;
