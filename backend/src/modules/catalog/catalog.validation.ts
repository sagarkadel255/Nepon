import { z } from 'zod';

const variantSchema = z.object({
  sku: z.string().min(1).max(50),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(30),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  altText: z.string().max(200).optional(),
});

export const createProductSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(2000),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID'),
    variants: z.array(variantSchema).min(1),
    images: z.array(imageSchema).max(6).optional(),
    status: z.enum(['draft', 'published']).optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().min(10).max(2000).optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    variants: z.array(variantSchema).min(1).optional(),
    images: z.array(imageSchema).max(6).optional(),
    status: z.enum(['draft', 'published', 'unpublished']).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    description: z.string().max(500).optional(),
    image: z.string().url().optional(),
    parentId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

export const getProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform(Number).pipe(z.number().int().positive()),
    limit: z.string().optional().transform(Number).pipe(z.number().int().positive().max(50)),
    category: z.string().optional(),
    minPrice: z.string().optional().transform(Number),
    maxPrice: z.string().optional().transform(Number),
    size: z.string().optional(),
    minRating: z.string().optional().transform(Number),
    sort: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(['draft', 'published', 'unpublished', 'flagged']).optional(),
  }),
});
