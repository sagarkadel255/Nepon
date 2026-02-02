import { Request, Response, NextFunction } from 'express';
import { Wishlist } from '../../models/Wishlist';
import { Product } from '../../models/Product';
import { AppError } from '../../utils/AppError';

function getUserId(req: Request): string {
  const userId = (req as any).user?.sub;
  if (!userId) throw AppError.unauthorized('Not authenticated');
  return userId;
}

export async function getWishlist(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    let wishlist = await Wishlist.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'title slug images variants ratingAverage ratingCount status',
    });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    res.json({
      status: 'success',
      data: { wishlist },
    });
  } catch (err) {
    next(err);
  }
}

export async function addItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const { productId } = req.body;

    if (!productId) throw AppError.badRequest('productId is required');

    const product = await Product.findOne({ _id: productId, status: 'published', deletedAt: null });
    if (!product) throw AppError.notFound('Product not found');

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    const exists = wishlist.items.some((item: any) => item.productId.toString() === productId);
    if (exists) {
      res.json({
        status: 'success',
        message: 'Product already in wishlist',
        data: { wishlist },
      });
      return;
    }

    wishlist.items.push({ productId, addedAt: new Date() });
    await wishlist.save();

    res.status(201).json({
      status: 'success',
      message: 'Product added to wishlist',
      data: { wishlist },
    });
  } catch (err) {
    next(err);
  }
}

export async function removeItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) throw AppError.notFound('Wishlist not found');

    wishlist.items = wishlist.items.filter(
      (item: any) => item.productId.toString() !== productId
    ) as any;
    await wishlist.save();

    res.json({
      status: 'success',
      message: 'Product removed from wishlist',
      data: { wishlist },
    });
  } catch (err) {
    next(err);
  }
}

export async function clearWishlist(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    await Wishlist.findOneAndUpdate({ userId }, { items: [] });

    res.json({
      status: 'success',
      message: 'Wishlist cleared',
    });
  } catch (err) {
    next(err);
  }
}
