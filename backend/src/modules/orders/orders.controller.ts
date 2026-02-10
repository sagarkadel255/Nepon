import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';

export class OrdersController {
  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id as string;
      const role = (req as any).user.role as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;
      const result = await ordersService.getMyOrders(userId, role, page, limit, status);
      res.json(result);
    } catch (error) { next(error); }
  }

  async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id as string;
      const role = (req as any).user.role as string;
      const orderId = req.params.id as string;
      const order = await ordersService.getOrder(orderId, userId, role);
      res.json(order);
    } catch (error) { next(error); }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id as string;
      const orderId = req.params.id as string;
      const order = await ordersService.updateOrderStatus(orderId, req.body.status, userId);
      res.json(order);
    } catch (error) { next(error); }
  }

  async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id as string;
      const orderId = req.params.id as string;
      const order = await ordersService.cancelOrder(orderId, userId);
      res.json(order);
    } catch (error) { next(error); }
  }

  async getOrderTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id as string;
      const role = (req as any).user.role as string;
      const orderId = req.params.id as string;
      const timeline = await ordersService.getOrderTimeline(orderId, userId, role);
      res.json(timeline);
    } catch (error) { next(error); }
  }
}

export const ordersController = new OrdersController();
