import { z } from 'zod';

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    variantSku: z.string().min(1),
    quantity: z.number().int().positive().max(10),
  }),
});

export const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().positive().max(10),
  }),
  params: z.object({
    itemId: z.string(),
  }),
});
