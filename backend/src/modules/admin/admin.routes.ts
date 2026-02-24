import { Router } from "express";
import { adminController } from "./admin.controller";
import { authenticate, authorize, requireMfaForAdmin } from "../../middleware/auth";
import { validate, asyncHandler } from "../../middleware/validate";
import {
  approveSellerSchema,
  rejectSellerSchema,
  suspendUserSchema,
  reactivateUserSchema,
  getUsersSchema,
  getUserByIdSchema,
  moderateProductSchema,
  getAuditLogsSchema,
  getSecurityDashboardSchema,
  getAnalyticsSchema,
  getSellerApplicationsSchema,
  getFlaggedProductsSchema,
} from "./admin.validation";

const router = Router();

// All admin routes require authentication + admin role + enrolled MFA
router.use(authenticate as any);
router.use(authorize("admin") as any);
router.use(requireMfaForAdmin as any);

router.get("/sellers/pending", validate(getSellerApplicationsSchema), asyncHandler(adminController.getSellerApplications));
router.patch("/sellers/:id/approve", validate(approveSellerSchema), asyncHandler(adminController.approveSeller));
router.patch("/sellers/:id/reject", validate(rejectSellerSchema), asyncHandler(adminController.rejectSeller));
router.patch("/users/:id/suspend", validate(suspendUserSchema), asyncHandler(adminController.suspendUser));
router.patch("/users/:id/reactivate", validate(reactivateUserSchema), asyncHandler(adminController.reactivateUser));
router.get("/users", validate(getUsersSchema), asyncHandler(adminController.getUsers));
router.get("/users/:id", validate(getUserByIdSchema), asyncHandler(adminController.getUserById));
router.get("/products/flagged", validate(getFlaggedProductsSchema), asyncHandler(adminController.getFlaggedProducts));
router.patch("/products/:id/moderate", validate(moderateProductSchema), asyncHandler(adminController.moderateProduct));
router.get("/audit-logs", validate(getAuditLogsSchema), asyncHandler(adminController.getAuditLogs));
router.get("/security", validate(getSecurityDashboardSchema), asyncHandler(adminController.getSecurityDashboard));
router.get("/analytics", validate(getAnalyticsSchema), asyncHandler(adminController.getAnalytics));

export default router;
