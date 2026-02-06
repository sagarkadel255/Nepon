import { Router } from 'express';
import { checkoutController } from './checkout.controller';
import { authenticate } from '../auth/auth.middleware';
import { validate } from '../../utils/validate';
import { createCheckoutSchema } from './checkout.validation';

const router = Router();

router.post('/session', authenticate, validate(createCheckoutSchema), checkoutController.createCheckoutSession);
router.post('/webhook', checkoutController.handleWebhook);
router.get('/summary', authenticate, checkoutController.getOrderSummary);

export default router;
