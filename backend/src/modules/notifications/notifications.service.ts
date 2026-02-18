import mongoose from "mongoose";
import { Notification, INotification, NotificationType } from "../../models/Notification";
import { Order, IOrder } from "../../models/Order";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";

export class NotificationsService {
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
  ): Promise<INotification> {
    return Notification.create({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      title,
      message,
      data,
    });
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    options: { type?: string; unreadOnly?: boolean } = {},
  ): Promise<{ notifications: INotification[]; total: number; page: number; pages: number; unreadCount: number }> {
    const filter: Record<string, any> = { userId: new mongoose.Types.ObjectId(userId) };

    if (options.type) filter.type = options.type;
    if (options.unreadOnly) filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    return {
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!notification) {
      throw AppError.notFound("Notification not found");
    }

    notification.isRead = true;
    await notification.save();

    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });
  }

  async createOrderNotification(order: IOrder, event: string): Promise<void> {
    const statusMessages: Record<string, { title: string; message: string }> = {
      confirmed: {
        title: "Order Confirmed",
        message: `Your order #${order.orderNumber} has been confirmed.`,
      },
      shipped: {
        title: "Order Shipped",
        message: `Your order #${order.orderNumber} has been shipped.`,
      },
      delivered: {
        title: "Order Delivered",
        message: `Your order #${order.orderNumber} has been delivered. You can now leave a review.`,
      },
      completed: {
        title: "Order Completed",
        message: `Your order #${order.orderNumber} has been completed. Thank you for your purchase!`,
      },
      cancelled: {
        title: "Order Cancelled",
        message: `Your order #${order.orderNumber} has been cancelled.`,
      },
      refunded: {
        title: "Order Refunded",
        message: `Your order #${order.orderNumber} has been refunded.`,
      },
    };

    const notificationData = statusMessages[event] || {
      title: "Order Updated",
      message: `Your order #${order.orderNumber} status has been updated to ${event}.`,
    };

    await this.createNotification(
      order.buyerId.toString(),
      "order_status",
      notificationData.title,
      notificationData.message,
      { orderId: order._id.toString(), orderNumber: order.orderNumber, event },
    );

    for (const item of order.items) {
      if (item.sellerId.toString() !== order.buyerId.toString()) {
        await this.createNotification(
          item.sellerId.toString(),
          "order_status",
          `Order #${order.orderNumber} ${event}`,
          `Order #${order.orderNumber} for "${item.title}" has been ${event}.`,
          { orderId: order._id.toString(), orderNumber: order.orderNumber, event, productId: item.productId.toString() },
        );
      }
    }
  }

  async createSecurityNotification(userId: string, event: string): Promise<void> {
    const eventMessages: Record<string, { title: string; message: string }> = {
      new_device_login: {
        title: "New Device Login",
        message: "A new device has been used to log into your account. If this was not you, please change your password immediately.",
      },
      password_changed: {
        title: "Password Changed",
        message: "Your password has been changed. If you did not make this change, contact support immediately.",
      },
      mfa_enabled: {
        title: "MFA Enabled",
        message: "Multi-factor authentication has been enabled on your account.",
      },
      mfa_disabled: {
        title: "MFA Disabled",
        message: "Multi-factor authentication has been disabled on your account.",
      },
      account_locked: {
        title: "Account Locked",
        message: "Your account has been temporarily locked due to too many failed login attempts.",
      },
    };

    const data = eventMessages[event] || {
      title: "Security Alert",
      message: `A security event occurred on your account: ${event}`,
    };

    await this.createNotification(userId, "security", data.title, data.message, { event });
  }

  async createModerationNotification(userId: string, action: string, details: Record<string, unknown> = {}): Promise<void> {
    const actionMessages: Record<string, { title: string; message: string }> = {
      product_flagged: {
        title: "Product Flagged",
        message: "One of your products has been flagged for review by an administrator.",
      },
      product_removed: {
        title: "Product Removed",
        message: "One of your products has been removed for violating platform guidelines.",
      },
      review_flagged: {
        title: "Review Flagged",
        message: "One of your reviews has been flagged for inappropriate content.",
      },
      warning: {
        title: "Account Warning",
        message: "Your account has received a warning. Please review our community guidelines.",
      },
    };

    const data = actionMessages[action] || {
      title: "Moderation Notice",
      message: `A moderation action has been taken on your account: ${action}`,
    };

    await this.createNotification(userId, "moderation", data.title, data.message, { action, ...details });
  }
}

export const notificationsService = new NotificationsService();
