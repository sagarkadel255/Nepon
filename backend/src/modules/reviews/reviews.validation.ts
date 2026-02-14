import { z } from "zod";

export const createReviewSchema = z.object({
  body: z.object({
    orderId: z.string().min(1, "Order ID is required"),
    productId: z.string().min(1, "Product ID is required"),
    rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    comment: z
      .string()
      .min(3, "Review must be at least 3 characters")
      .max(2000, "Review must be at most 2000 characters")
      .trim(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const getProductReviewsSchema = z.object({
  params: z.object({
    productId: z.string().min(1, "Product ID is required"),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
  }),
  body: z.object({}).optional(),
});

export const getMyReviewsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Review ID is required"),
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z
      .string()
      .min(3, "Review must be at least 3 characters")
      .max(2000, "Review must be at most 2000 characters")
      .trim()
      .optional(),
  }),
  query: z.object({}).optional(),
});

export const deleteReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Review ID is required"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const flagReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Review ID is required"),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
  query: z.object({}).optional(),
});

export const removeReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Review ID is required"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>["body"];
export type GetProductReviewsParams = z.infer<typeof getProductReviewsSchema>["params"];
export type GetProductReviewsQuery = z.infer<typeof getProductReviewsSchema>["query"];
export type GetMyReviewsQuery = z.infer<typeof getMyReviewsSchema>["query"];
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>["body"];
export type FlagReviewInput = z.infer<typeof flagReviewSchema>["body"];
