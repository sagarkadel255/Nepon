import { Request, Response, NextFunction } from "express";
import { reviewsService } from "./reviews.service";
import { logAuditAction } from "../../middleware/audit";

export class ReviewsController {
  async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const { orderId, productId, rating, comment } = req.body;
      const review = await reviewsService.createReview(userId, orderId, productId, rating, comment);

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProductReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.productId as string;
      const { page, limit, sort } = req.query as any;

      const result = await reviewsService.getProductReviews(productId, page, limit, sort);

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const { page, limit } = req.query as any;

      const result = await reviewsService.getMyReviews(userId, page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;
      const { rating, comment } = req.body;

      const review = await reviewsService.updateReview(id, userId, { rating, comment });

      res.json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;

      await reviewsService.deleteReview(id, userId);

      res.json({
        success: true,
        message: "Review removed successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  async flagReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;

      const review = await reviewsService.flagReview(id, userId);

      await logAuditAction(req, "review.flag", "review", id, { reason: req.body.reason });

      res.json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  async removeReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.sub as string;
      if (!userId) { next(new Error("Not authenticated")); return; }
      const id = req.params.id as string;

      await reviewsService.removeReview(id, userId);

      await logAuditAction(req, "review.remove", "review", id);

      res.json({
        success: true,
        message: "Review removed successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reviewsController = new ReviewsController();
