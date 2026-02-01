import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';

export class CartController {
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?._id as string | undefined;
      const guestToken = req.cookies?.guestToken as string | undefined;
      const cart = await cartService.getCart(userId, guestToken);
      res.json(cart);
    } catch (error) { next(error); }
  }

  async addToCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?._id as string | undefined;
      const guestToken = req.cookies?.guestToken as string | undefined;
      const cart = await cartService.addToCart(req.body, userId, guestToken);
      res.json(cart);
    } catch (error) { next(error); }
  }

  async updateCartItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?._id as string | undefined;
      const guestToken = req.cookies?.guestToken as string | undefined;
      const itemId = req.params.itemId as string;
      const cart = await cartService.updateCartItem(itemId, req.body.quantity, userId, guestToken);
      res.json(cart);
    } catch (error) { next(error); }
  }

  async removeFromCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?._id as string | undefined;
      const guestToken = req.cookies?.guestToken as string | undefined;
      const itemId = req.params.itemId as string;
      const cart = await cartService.removeFromCart(itemId, userId, guestToken);
      res.json(cart);
    } catch (error) { next(error); }
  }

  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?._id as string | undefined;
      const guestToken = req.cookies?.guestToken as string | undefined;
      const cart = await cartService.clearCart(userId, guestToken);
      res.json(cart);
    } catch (error) { next(error); }
  }

  async mergeGuestCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id as string;
      const guestToken = req.cookies?.guestToken as string | undefined;
      if (!guestToken) return res.json({ message: 'No guest cart to merge' });
      const cart = await cartService.mergeGuestCart(userId, guestToken);
      res.json(cart || { message: 'No guest cart to merge' });
    } catch (error) { next(error); }
  }
}

export const cartController = new CartController();
