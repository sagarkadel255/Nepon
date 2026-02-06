import { Request, Response, NextFunction } from 'express';
import { checkoutService } from './checkout.service';

export class CheckoutController {
  async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const { shippingAddress, paymentMethod } = req.body;
      const result = await checkoutService.createPaymentIntent(userId, shippingAddress, paymentMethod);
      res.json(result);
    } catch (error) { next(error); }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const result = await checkoutService.handleWebhook(req.body);
      res.json(result);
    } catch (error) { next(error); }
  }

  async getOrderSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const summary = await checkoutService.getOrderSummary(userId);
      res.json(summary);
    } catch (error) { next(error); }
  }
}

export const checkoutController = new CheckoutController();
