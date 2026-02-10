import { Router } from 'express';
import { ordersController } from './orders.controller';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '../../utils/validate';
import { updateOrderStatusSchema } from './orders.validation';

const router = Router();

router.use(authenticate);

router.get('/', ordersController.getMyOrders);
router.get('/:id', ordersController.getOrder);
router.patch('/:id/status', authorize('seller'), validate(updateOrderStatusSchema), ordersController.updateOrderStatus);
router.post('/:id/cancel', authorize('buyer'), ordersController.cancelOrder);
router.get('/:id/timeline', ordersController.getOrderTimeline);

export default router;
