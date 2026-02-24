import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";
import { logAuditAction } from "../../middleware/audit";

export class AdminController {
  async getSellerApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, status } = req.query as any;
      const result = await adminService.getSellerApplications(page, limit, status);

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async approveSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;
      const profile = await adminService.approveSeller(id, userId);

      await logAuditAction(req, "seller.approve", "sellerProfile", id);

      res.json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;
      const { reason } = req.body;
      const profile = await adminService.rejectSeller(id, userId, reason);

      await logAuditAction(req, "seller.reject", "sellerProfile", id, { reason });

      res.json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;
      const { reason } = req.body;
      const user = await adminService.suspendUser(id, userId, reason);

      await logAuditAction(req, "user.suspend", "user", id, { reason });

      res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async reactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;
      const user = await adminService.reactivateUser(id, userId);

      await logAuditAction(req, "user.reactivate", "user", id);

      res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, role, status, search } = req.query as any;
      const result = await adminService.getUsers(page, limit, { role, status, search });

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = await adminService.getUserById(id);

      res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async getFlaggedProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as any;
      const result = await adminService.getFlaggedProducts(page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async moderateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;
      const { action, reason } = req.body;

      await adminService.moderateProduct(id, action, userId, reason);

      await logAuditAction(req, `product.${action}`, "product", id, { reason });

      res.json({
        success: true,
        message: `Product ${action === "approve" ? "approved" : action === "flag" ? "flagged" : "removed"} successfully`,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, action, targetType, actorId, startDate, endDate } = req.query as any;
      const result = await adminService.getAuditLogs(page, limit, {
        action,
        targetType,
        actorId,
        startDate,
        endDate,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSecurityDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days } = req.query as any;
      const result = await adminService.getSecurityDashboard(days);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days } = req.query as any;
      const result = await adminService.getAnalytics(days);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
