import Cart from '../../models/Cart';
import { Product } from '../../models/Product';
import { AppError } from '../../utils/AppError';

export class CartService {
  async getCart(userId?: string, guestToken?: string) {
    if (userId) {
      const cart = await Cart.findOne({ userId }).populate('items.productId', 'title slug images status');
      return cart || { items: [] };
    }
    if (guestToken) {
      const cart = await Cart.findOne({ guestToken }).populate('items.productId', 'title slug images status');
      return cart || { items: [] };
    }
    return { items: [] };
  }

  async addToCart(data: any, userId?: string, guestToken?: string) {
    const product = await Product.findOne({ _id: data.productId, deletedAt: null, status: 'published' });
    if (!product) throw new AppError('Product not found', 404);

    const variant = product.variants.find((v: any) => v.sku === data.variantSku);
    if (!variant) throw new AppError('Variant not found', 404);
    if (variant.stock < data.quantity) throw new AppError('Insufficient stock', 400);

    let cart;
    if (userId) {
      cart = await Cart.findOne({ userId });
      if (!cart) { cart = new Cart({ userId, items: [] }); }
    } else if (guestToken) {
      cart = await Cart.findOne({ guestToken });
      if (!cart) { cart = new Cart({ guestToken, items: [] }); }
    } else {
      throw new AppError('Cart identification required', 400);
    }

    const existingItem = cart.items.find(
      (item: any) => item.productId.toString() === data.productId && item.variantSku === data.variantSku
    );

    if (existingItem) {
      existingItem.quantity += data.quantity;
      if (existingItem.quantity > variant.stock) {
        existingItem.quantity = variant.stock;
      }
    } else {
      cart.items.push({
        productId: data.productId,
        variantSku: data.variantSku,
        quantity: data.quantity,
        priceAtAdd: variant.price,
      } as any);
    }

    await cart.save();
    return cart;
  }

  async updateCartItem(itemId: string, quantity: number, userId?: string, guestToken?: string) {
    const cart = userId
      ? await Cart.findOne({ userId })
      : await Cart.findOne({ guestToken });

    if (!cart) throw new AppError('Cart not found', 404);

    const item = (cart.items as any).id(itemId);
    if (!item) throw new AppError('Cart item not found', 404);

    const product = await Product.findOne({ _id: item.productId, deletedAt: null });
    if (!product) throw new AppError('Product not found', 404);

    const variant = product.variants.find((v: any) => v.sku === item.variantSku);
    if (!variant) throw new AppError('Variant not found', 404);
    if (quantity > variant.stock) throw new AppError('Insufficient stock', 400);

    item.quantity = quantity;
    await cart.save();
    return cart;
  }

  async removeFromCart(itemId: string, userId?: string, guestToken?: string) {
    const cart = userId
      ? await Cart.findOne({ userId })
      : await Cart.findOne({ guestToken });

    if (!cart) throw new AppError('Cart not found', 404);

    cart.items = cart.items.filter((item: any) => (item as any)._id.toString() !== itemId);
    await cart.save();
    return cart;
  }

  async clearCart(userId?: string, guestToken?: string) {
    const cart = userId
      ? await Cart.findOne({ userId })
      : await Cart.findOne({ guestToken });

    if (!cart) throw new AppError('Cart not found', 404);

    cart.items = [];
    await cart.save();
    return cart;
  }

  async mergeGuestCart(userId: string, guestToken: string) {
    const guestCart = await Cart.findOne({ guestToken });
    if (!guestCart || guestCart.items.length === 0) return null;

    let userCart = await Cart.findOne({ userId });
    if (!userCart) {
      userCart = new Cart({ userId, items: guestCart.items });
    } else {
      for (const guestItem of guestCart.items) {
        const existingItem = userCart.items.find(
          (item: any) =>
            item.productId.toString() === (guestItem as any).productId.toString() &&
            item.variantSku === (guestItem as any).variantSku
        );
        if (existingItem) {
          existingItem.quantity += (guestItem as any).quantity;
        } else {
          userCart.items.push(guestItem);
        }
      }
    }

    await userCart.save();
    await Cart.deleteOne({ guestToken });
    return userCart;
  }
}

export const cartService = new CartService();
