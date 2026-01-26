import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { AppError } from '../../utils/AppError';
import slugify from 'slugify';

export class CatalogService {
  async getProducts(filters: any) {
    const { page = 1, limit = 12, category, minPrice, maxPrice, size, minRating, sort, search, status } = filters;
    const query: any = { deletedAt: null };
    if (status) query.status = status;
    else query.status = 'published';
    if (category) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category = category;
      }
    }
    if (minPrice || maxPrice) {
      query['variants.price'] = {};
      if (minPrice) query['variants.price'].$gte = minPrice;
      if (maxPrice) query['variants.price'].$lte = maxPrice;
    }
    if (size) query['variants.size'] = size;
    if (minRating) query.ratingAverage = { $gte: minRating };
    if (search) query.$text = { $search: search };

    let sortObj: any = { createdAt: -1 };
    if (sort) {
      const sortMap: Record<string, any> = {
        price_asc: { 'variants.price': 1 },
        price_desc: { 'variants.price': -1 },
        rating: { ratingAverage: -1 },
        newest: { createdAt: -1 },
        popular: { ratingCount: -1 },
      };
      sortObj = sortMap[sort] || sortObj;
    }
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).sort(sortObj).skip(skip).limit(limit)
        .populate('category', 'name slug')
        .populate('sellerId', 'displayName')
        .lean(),
      Product.countDocuments(query),
    ]);
    return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProductByIdOrSlug(idOrSlug: string) {
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
    const product = await Product.findOne({ ...query, deletedAt: null })
      .populate('category', 'name slug')
      .populate('sellerId', 'displayName email');
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async createProduct(data: any, sellerId: string) {
    const slug = await this.generateUniqueSlug(data.title);
    return Product.create({ ...data, sellerId, slug, status: data.status || 'draft' });
  }

  async updateProduct(id: string, data: any, sellerId: string) {
    const product = await Product.findOne({ _id: id, deletedAt: null });
    if (!product) throw new AppError('Product not found', 404);
    if (product.sellerId.toString() !== sellerId) throw new AppError('Not authorized', 403);
    if (data.title && data.title !== product.title) {
      data.slug = await this.generateUniqueSlug(data.title);
    }
    Object.assign(product, data);
    await product.save();
    return product;
  }

  async deleteProduct(id: string, sellerId: string) {
    const product = await Product.findOne({ _id: id, deletedAt: null });
    if (!product) throw new AppError('Product not found', 404);
    if (product.sellerId.toString() !== sellerId) throw new AppError('Not authorized', 403);
    product.deletedAt = new Date();
    await product.save();
  }

  async publishProduct(id: string, sellerId: string) {
    const product = await Product.findOne({ _id: id, deletedAt: null });
    if (!product) throw new AppError('Product not found', 404);
    if (product.sellerId.toString() !== sellerId) throw new AppError('Not authorized', 403);
    product.status = 'published';
    await product.save();
    return product;
  }

  async unpublishProduct(id: string, sellerId: string) {
    const product = await Product.findOne({ _id: id, deletedAt: null });
    if (!product) throw new AppError('Product not found', 404);
    if (product.sellerId.toString() !== sellerId) throw new AppError('Not authorized', 403);
    product.status = 'unpublished';
    await product.save();
    return product;
  }

  async getMyProducts(sellerId: string, page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find({ sellerId, deletedAt: null }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments({ sellerId, deletedAt: null }),
    ]);
    return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCategories() {
    return Category.find({ deletedAt: null }).sort({ name: 1 });
  }

  async createCategory(data: any) {
    const slug = slugify(data.name, { lower: true, strict: true });
    const existing = await Category.findOne({ slug });
    if (existing) throw new AppError('Category already exists', 409);
    return Category.create({ ...data, slug });
  }

async updateCategory(id: string, data: any) {
    const category = await Category.findOne({ _id: id, deletedAt: null });
    if (!category) throw new AppError('Category not found', 404);
    if (data.name) (category as any).slug = slugify(data.name, { lower: true, strict: true });
    Object.assign(category, data);
    await category.save();
    return category;
  }

  async deleteCategory(id: string) {
    const category = await Category.findOne({ _id: id, deletedAt: null });
    if (!category) throw new AppError('Category not found', 404);
    category.deletedAt = new Date();
    await category.save();
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    let slug = slugify(title, { lower: true, strict: true });
    let counter = 0;
    while (await Product.findOne({ slug })) {
      counter++;
      slug = `${slug}-${counter}`;
    }
    return slug;
  }
}
export const catalogService = new CatalogService();
