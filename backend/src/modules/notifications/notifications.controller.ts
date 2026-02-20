import { Request, Response, NextFunction } from "express";
import { notificationsService } from "./notifications.service";

export class NotificationsController {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const { page, limit, type, unreadOnly } = req.query as any;

      const result = await notificationsService.getUserNotifications(userId, page, limit, {
        type,
        unreadOnly,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;

      const notification = await notificationsService.markAsRead(id, userId);

      res.json({
        success: true,
        data: notification,
      });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      await notificationsService.markAllAsRead(userId);

      res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const count = await notificationsService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationsController = new NotificationsController();
