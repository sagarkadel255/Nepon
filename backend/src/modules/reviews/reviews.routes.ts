import { Router, Request, Response, NextFunction } from "express";
import { reviewsController } from "./reviews.controller";
import { authenticate, authorize } from "../../middleware/auth";
import { validate, asyncHandler } from "../../middleware/validate";
import {
  createReviewSchema,
  getProductReviewsSchema,
  getMyReviewsSchema,
  updateReviewSchema,
  deleteReviewSchema,
  flagReviewSchema,
  removeReviewSchema,
} from "./reviews.validation";

const router = Router();

router.post(
  "/",
  authenticate as any,
  authorize("buyer") as any,
  validate(createReviewSchema),
  asyncHandler(reviewsController.createReview),
);

router.get(
  "/mine",
  authenticate as any,
  authorize("buyer") as any,
  validate(getMyReviewsSchema),
  asyncHandler(reviewsController.getMyReviews),
);

router.get(
  "/product/:productId",
  validate(getProductReviewsSchema),
  asyncHandler(reviewsController.getProductReviews),
);

router.put(
  "/:id",
  authenticate as any,
  authorize("buyer") as any,
  validate(updateReviewSchema),
  asyncHandler(reviewsController.updateReview),
);

router.delete(
  "/:id",
  authenticate as any,
  authorize("buyer") as any,
  validate(deleteReviewSchema),
  asyncHandler(reviewsController.deleteReview),
);

router.patch(
  "/:id/flag",
  authenticate as any,
  authorize("admin") as any,
  validate(flagReviewSchema),
  asyncHandler(reviewsController.flagReview),
);

router.patch(
  "/:id/remove",
  authenticate as any,
  authorize("admin") as any,
  validate(removeReviewSchema),
  asyncHandler(reviewsController.removeReview),
);

export default router;
