import { z } from 'zod';

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['confirmed', 'shipped', 'delivered']),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

export const getOrdersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform(Number),
    limit: z.string().optional().transform(Number),
    status: z.string().optional(),
  }),
});
