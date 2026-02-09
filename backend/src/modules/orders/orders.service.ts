import { Order } from '../../models/Order';
import { AppError } from '../../utils/AppError';

const VALID_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  refunded: [],
};

const SELLER_TRANSITIONS = ['confirmed', 'shipped', 'delivered'];
const BUYER_TRANSITIONS = ['cancelled'];

export class OrdersService {
  async getMyOrders(userId: string, role: string, page = 1, limit = 10, status?: string) {
    const query: any = {};
    if (role === 'buyer') {
      query.buyerId = userId;
    } else if (role === 'seller') {
      query['items.sellerId'] = userId;
    }
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('buyerId', 'displayName email')
        .populate('items.productId', 'title slug images'),
      Order.countDocuments(query),
    ]);
    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrder(orderId: string, userId: string, role: string) {
    const order = await Order.findById(orderId)
      .populate('buyerId', 'displayName email')
      .populate('items.productId', 'title slug images');
    if (!order) throw new AppError('Order not found', 404);

    if (role === 'buyer' && order.buyerId._id.toString() !== userId) {
      throw new AppError('Not authorized', 403);
    }
    if (role === 'seller') {
      const hasSellerProduct = order.items.some((item: any) => item.sellerId.toString() === userId);
      if (!hasSellerProduct) throw new AppError('Not authorized', 403);
    }
    return order;
  }

  async updateOrderStatus(orderId: string, newStatus: string, userId: string) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    const currentStatus = order.status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(`Cannot transition from ${currentStatus} to ${newStatus}`, 400);
    }

    if (SELLER_TRANSITIONS.includes(newStatus)) {
      const hasSellerProduct = order.items.some((item: any) => item.sellerId.toString() === userId);
      if (!hasSellerProduct) throw new AppError('Not authorized', 403);
    }

    order.status = newStatus as any;
    order.statusHistory.push({
      status: newStatus as any,
      changedBy: userId as any,
      changedAt: new Date(),
    });
    await order.save();
    return order;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    if (order.buyerId.toString() !== userId) throw new AppError('Not authorized', 403);

    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes('cancelled')) {
      throw new AppError(`Cannot cancel order in ${order.status} status`, 400);
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      changedBy: userId as any,
      changedAt: new Date(),
    });
    await order.save();
    return order;
  }

  async getOrderTimeline(orderId: string, userId: string, role: string) {
    const order = await Order.findById(orderId).select('orderNumber status statusHistory');
    if (!order) throw new AppError('Order not found', 404);
    return order;
  }
}

export const ordersService = new OrdersService();
