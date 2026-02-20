import { Router } from "express";
import { notificationsController } from "./notifications.controller";
import { authenticate } from "../../middleware/auth";
import { validate, asyncHandler } from "../../middleware/validate";
import {
  getNotificationsSchema,
  markAsReadSchema,
  markAllAsReadSchema,
  getUnreadCountSchema,
} from "./notifications.validation";

const router = Router();

// All notification routes require authentication
router.use(authenticate as any);

router.get(
  "/",
  validate(getNotificationsSchema),
  asyncHandler(notificationsController.getNotifications),
);

router.get(
  "/unread-count",
  validate(getUnreadCountSchema),
  asyncHandler(notificationsController.getUnreadCount),
);

router.patch(
  "/read-all",
  validate(markAllAsReadSchema),
  asyncHandler(notificationsController.markAllAsRead),
);

router.patch(
  "/:id/read",
  validate(markAsReadSchema),
  asyncHandler(notificationsController.markAsRead),
);

export default router;
