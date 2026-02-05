import mongoose from 'mongoose';
import Cart from '../../models/Cart';
import { Product } from '../../models/Product';
import { Order } from '../../models/Order';
import { Payment } from '../../models/Payment';
import { AppError } from '../../utils/AppError';
import crypto from 'crypto';

export class CheckoutService {
  async validateCart(userId: string) {
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) throw new AppError('Cart is empty', 400);

    const validatedItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = await Product.findOne({ _id: item.productId, deletedAt: null, status: 'published' });
      if (!product) throw new AppError(`Product ${item.productId} not found or unavailable`, 400);

      const variant = product.variants.find((v: any) => v.sku === item.variantSku);
      if (!variant) throw new AppError(`Variant ${item.variantSku} not found`, 400);
      if (variant.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.title} (${variant.size}/${variant.color})`, 400);
      }

      validatedItems.push({
        productId: product._id,
        sellerId: product.sellerId,
        variantSku: variant.sku,
        title: product.title,
        size: variant.size,
        color: variant.color,
        unitPrice: variant.price,
        quantity: item.quantity,
      });
      totalAmount += variant.price * item.quantity;
    }

    return { items: validatedItems, totalAmount };
  }

  async createPaymentIntent(userId: string, shippingAddress: any, paymentMethod: string) {
    const { items, totalAmount } = await this.validateCart(userId);

    const orderNumber = await this.generateOrderNumber();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const item of items) {
        const result = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            'variants.sku': item.variantSku,
            'variants.stock': { $gte: item.quantity },
          },
          {
            $inc: { 'variants.$.stock': -item.quantity },
          },
          { session, new: true }
        );
        if (!result) {
          throw new AppError(`Stock unavailable for ${item.title}`, 400);
        }
      }

      // Create order and payment record within the same transaction
      const [order] = await Order.create([{
        orderNumber,
        buyerId: userId,
        items,
        shippingAddress,
        status: 'placed',
        statusHistory: [{ status: 'placed', changedBy: userId, changedAt: new Date() }],
        totalAmount,
      }], { session });

      const [payment] = await Payment.create([{
        orderId: order._id,
        provider: paymentMethod as any,
        providerPaymentId: `pi_${crypto.randomBytes(16).toString('hex')}`,
        amount: totalAmount,
        currency: 'NPR',
        status: 'pending',
        webhookVerified: false,
      }], { session });

      order.paymentId = payment._id;
      await order.save({ session });

      await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } }, { session });

      await session.commitTransaction();

      return {
        orderId: order._id,
        orderNumber,
        clientSecret: `cs_${crypto.randomBytes(24).toString('hex')}`,
        totalAmount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async handleWebhook(event: any) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntentId = event.data.object.id;
      const payment = await Payment.findOne({ providerPaymentId: paymentIntentId });
      if (!payment) throw new AppError('Payment not found', 404);

      payment.status = 'succeeded';
      payment.webhookVerified = true;
      await payment.save();

      const order = await Order.findById(payment.orderId);
      if (order) {
        order.status = 'confirmed';
        order.statusHistory.push({ status: 'confirmed', changedBy: order.buyerId, changedAt: new Date() });
        await order.save();
      }

      // The webhook may run after the cart was already cleared at checkout.
      await Cart.findOneAndUpdate({ userId: order?.buyerId }, { $set: { items: [] } });
    }
    return { received: true };
  }

  async getOrderSummary(userId: string) {
    const { items, totalAmount } = await this.validateCart(userId);
    return { items, totalAmount, itemCount: items.reduce((sum: number, i: any) => sum + i.quantity, 0) };
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
    return `NEPON-${dateStr}-${random}`;
  }
}

export const checkoutService = new CheckoutService();
