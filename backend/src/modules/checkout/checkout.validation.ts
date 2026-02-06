import { z } from 'zod';

export const createCheckoutSchema = z.object({
  body: z.object({
    shippingAddress: z.object({
      fullName: z.string().min(1).max(100),
      phone: z.string().min(10).max(15),
      line1: z.string().min(5).max(200),
      city: z.string().min(2).max(100),
      district: z.string().min(2).max(100),
    }),
    paymentMethod: z.enum(['stripe', 'esewa', 'khalti']),
  }),
});
