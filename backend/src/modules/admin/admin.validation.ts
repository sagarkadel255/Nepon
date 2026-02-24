import { z } from "zod";

export const approveSellerSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Seller profile ID is required"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const rejectSellerSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Seller profile ID is required"),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
  query: z.object({}).optional(),
});

export const suspendUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
  body: z.object({
    reason: z.string().min(1, "Reason is required").max(500),
  }),
  query: z.object({}).optional(),
});

export const reactivateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const getUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    role: z.enum(["buyer", "seller", "admin"]).optional(),
    status: z.enum(["active", "suspended", "pending_verification"]).optional(),
    search: z.string().max(100).optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const moderateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Product ID is required"),
  }),
  body: z.object({
    action: z.enum(["approve", "flag", "remove"]),
    reason: z.string().max(500).optional(),
  }),
  query: z.object({}).optional(),
});

export const getAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    action: z.string().max(100).optional(),
    targetType: z.string().max(50).optional(),
    actorId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getSecurityDashboardSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(90).default(7),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getAnalyticsSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getSellerApplicationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getFlaggedProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export type GetUsersQuery = z.infer<typeof getUsersSchema>["query"];
export type GetAuditLogsQuery = z.infer<typeof getAuditLogsSchema>["query"];
export type ModerateProductInput = z.infer<typeof moderateProductSchema>["body"];
export type SuspendUserInput = z.infer<typeof suspendUserSchema>["body"];
