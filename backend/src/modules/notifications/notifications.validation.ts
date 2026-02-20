import { z } from "zod";

export const getNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    type: z
      .enum(["order_status", "security", "moderation", "seller_approval", "review", "system"])
      .optional(),
    unreadOnly: z.coerce.boolean().default(false),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Notification ID is required"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const markAllAsReadSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const getUnreadCountSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsSchema>["query"];
