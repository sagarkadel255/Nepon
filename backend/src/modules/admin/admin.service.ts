import mongoose from "mongoose";
import { User, IUser } from "../../models/User";
import { SellerProfile, ISellerProfile } from "../../models/SellerProfile";
import { Product } from "../../models/Product";
import { Order } from "../../models/Order";
import { Review } from "../../models/Review";
import { AuditLog } from "../../models/AuditLog";
import { LoginHistory } from "../../models/LoginHistory";
import { SecurityEvent } from "../../models/SecurityEvent";
import { RefreshToken } from "../../models/RefreshToken";
import { Notification } from "../../models/Notification";
import { AppError } from "../../utils/AppError";

export class AdminService {
  // Seller application management
  async getSellerApplications(
    page: number = 1,
    limit: number = 10,
    status: string = "pending",
  ): Promise<{ applications: ISellerProfile[]; total: number; page: number; pages: number }> {
    const filter = { verificationStatus: status as any };

    const [applications, total] = await Promise.all([
      SellerProfile.find(filter)
        .populate("userId", "email displayName status")
        .populate("approvedBy", "displayName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SellerProfile.countDocuments(filter),
    ]);

    return {
      applications,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async approveSeller(sellerProfileId: string, adminId: string): Promise<ISellerProfile> {
    const profile = await SellerProfile.findById(sellerProfileId);
    if (!profile) {
      throw AppError.notFound("Seller profile not found");
    }

    if (profile.verificationStatus === "approved") {
      throw AppError.badRequest("Seller is already approved");
    }

    profile.verificationStatus = "approved";
    profile.approvedBy = new mongoose.Types.ObjectId(adminId);
    profile.approvedAt = new Date();
    await profile.save();

    await User.findByIdAndUpdate(profile.userId, { role: "seller" });

    await Notification.create({
      userId: profile.userId,
      type: "seller_approval",
      title: "Seller Application Approved",
      message: "Your seller application has been approved. You can now list products.",
      data: { sellerProfileId, action: "approved" },
    });

    return profile;
  }

  async rejectSeller(sellerProfileId: string, adminId: string, reason?: string): Promise<ISellerProfile> {
    const profile = await SellerProfile.findById(sellerProfileId);
    if (!profile) {
      throw AppError.notFound("Seller profile not found");
    }

    if (profile.verificationStatus === "rejected") {
      throw AppError.badRequest("Seller is already rejected");
    }

    profile.verificationStatus = "rejected";
    profile.approvedBy = new mongoose.Types.ObjectId(adminId);
    profile.approvedAt = new Date();
    await profile.save();

    await Notification.create({
      userId: profile.userId,
      type: "seller_approval",
      title: "Seller Application Rejected",
      message: reason || "Your seller application has been rejected. Please contact support for details.",
      data: { sellerProfileId, action: "rejected", reason },
    });

    return profile;
  }

  // User management
  async suspendUser(targetUserId: string, adminId: string, reason: string): Promise<IUser> {
    if (targetUserId === adminId) {
      throw AppError.badRequest("Cannot suspend your own account");
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (user.status === "suspended") {
      throw AppError.badRequest("User is already suspended");
    }

    user.status = "suspended";
    await user.save();

    await RefreshToken.updateMany(
      { userId: targetUserId, revokedAt: null },
      { revokedAt: new Date() },
    );

    await Notification.create({
      userId: user._id,
      type: "moderation",
      title: "Account Suspended",
      message: `Your account has been suspended. Reason: ${reason}`,
      data: { reason, suspendedBy: adminId },
    });

    return user;
  }

  async reactivateUser(targetUserId: string, adminId: string): Promise<IUser> {
    const user = await User.findById(targetUserId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (user.status !== "suspended") {
      throw AppError.badRequest("User is not suspended");
    }

    user.status = "active";
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await user.save();

    await Notification.create({
      userId: user._id,
      type: "moderation",
      title: "Account Reactivated",
      message: "Your account has been reactivated. You can now access the platform.",
      data: { reactivatedBy: adminId },
    });

    return user;
  }

  async getUsers(
    page: number = 1,
    limit: number = 20,
    filters: { role?: string; status?: string; search?: string } = {},
  ): Promise<{ users: IUser[]; total: number; page: number; pages: number }> {
    const query: Record<string, any> = { deletedAt: null };

    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { email: { $regex: filters.search, $options: "i" } },
        { displayName: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash -mfaSecretEncrypted")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId)
      .select("-passwordHash -mfaSecretEncrypted")
      .lean();

    if (!user) {
      throw AppError.notFound("User not found");
    }

    return user;
  }

  // Product moderation
  async getFlaggedProducts(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ products: any[]; total: number; page: number; pages: number }> {
    const filter = { status: "flagged" as const };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("sellerId", "displayName email")
        .populate("category", "name")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return {
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async moderateProduct(
    productId: string,
    action: "approve" | "flag" | "remove",
    adminId: string,
    reason?: string,
  ): Promise<void> {
    const product = await Product.findById(productId);
    if (!product) {
      throw AppError.notFound("Product not found");
    }

    switch (action) {
      case "approve":
        product.status = "published";
        break;
      case "flag":
        product.status = "flagged";
        break;
      case "remove":
        product.status = "unpublished";
        product.deletedAt = new Date();
        break;
    }

    await product.save();

    await Notification.create({
      userId: product.sellerId,
      type: "moderation",
      title: `Product ${action === "approve" ? "Approved" : action === "flag" ? "Flagged" : "Removed"}`,
      message: `Your product "${product.title}" has been ${action}${reason ? `. Reason: ${reason}` : ""}`,
      data: { productId, action, reason },
    });
  }

  // Audit logs
  async getAuditLogs(
    page: number = 1,
    limit: number = 20,
    filters: {
      action?: string;
      targetType?: string;
      actorId?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{ logs: any[]; total: number; page: number; pages: number }> {
    const query: Record<string, any> = {};

    if (filters.action) query.action = { $regex: filters.action, $options: "i" };
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.actorId) query.actorId = new mongoose.Types.ObjectId(filters.actorId);
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actorId", "displayName email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // Security dashboard
  async getSecurityDashboard(days: number = 7): Promise<{
    failedLogins: { date: string; count: number }[];
    rateLimitTrips: { date: string; count: number }[];
    newDeviceLogins: { date: string; count: number }[];
    mfaFailures: { date: string; count: number }[];
    totalFailedLogins: number;
    totalSecurityEvents: number;
    lockedAccounts: number;
    suspendedAccounts: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dateGroupStage = {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    };

    const sortStage = { $sort: { _id: 1 as const } };

    const [failedLogins, rateLimitTrips, newDeviceLogins, mfaFailures, totals] = await Promise.all([
      LoginHistory.aggregate([
        { $match: { createdAt: { $gte: startDate }, outcome: { $in: ["bad_password", "account_locked", "mfa_failed"] } } },
        dateGroupStage,
        sortStage,
      ]),
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: startDate }, type: "rate_limit_trip" } },
        dateGroupStage,
        sortStage,
      ]),
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: startDate }, type: "new_device_login" } },
        dateGroupStage,
        sortStage,
      ]),
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: startDate }, type: "mfa_failure" } },
        dateGroupStage,
        sortStage,
      ]),
      Promise.all([
        LoginHistory.countDocuments({ createdAt: { $gte: startDate }, outcome: { $in: ["bad_password", "account_locked", "mfa_failed"] } }),
        SecurityEvent.countDocuments({ createdAt: { $gte: startDate } }),
        User.countDocuments({ lockedUntil: { $gt: new Date() } }),
        User.countDocuments({ status: "suspended" }),
      ]),
    ]);

    return {
      failedLogins: failedLogins.map((e) => ({ date: e._id, count: e.count })),
      rateLimitTrips: rateLimitTrips.map((e) => ({ date: e._id, count: e.count })),
      newDeviceLogins: newDeviceLogins.map((e) => ({ date: e._id, count: e.count })),
      mfaFailures: mfaFailures.map((e) => ({ date: e._id, count: e.count })),
      totalFailedLogins: totals[0],
      totalSecurityEvents: totals[1],
      lockedAccounts: totals[2],
      suspendedAccounts: totals[3],
    };
  }

  // Platform analytics
  async getAnalytics(days: number = 30): Promise<{
    users: { total: number; buyers: number; sellers: number; admins: number; newToday: number };
    orders: { total: number; todayCount: number; todayRevenue: number; avgOrderValue: number };
    products: { total: number; published: number; flagged: number };
    reviews: { total: number; averageRating: number };
    revenue: { total: number; daily: { date: string; amount: number }[] };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalUsers,
      buyers,
      sellers,
      admins,
      newToday,
      totalOrders,
      todayOrders,
      todayRevenue,
      avgOrderResult,
      totalProducts,
      publishedProducts,
      flaggedProducts,
      totalReviews,
      avgRatingResult,
      totalRevenue,
      dailyRevenue,
    ] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ role: "buyer", deletedAt: null }),
      User.countDocuments({ role: "seller", deletedAt: null }),
      User.countDocuments({ role: "admin", deletedAt: null }),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Order.countDocuments({}),
      Order.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }, status: { $nin: ["cancelled", "refunded"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { status: { $nin: ["cancelled", "refunded"] } } },
        { $group: { _id: null, avg: { $avg: "$totalAmount" } } },
      ]),
      Product.countDocuments({ deletedAt: null }),
      Product.countDocuments({ status: "published", deletedAt: null }),
      Product.countDocuments({ status: "flagged" }),
      Review.countDocuments({}),
      Review.aggregate([
        { $match: { status: "visible" } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
      Order.aggregate([
        { $match: { status: { $nin: ["cancelled", "refunded"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $nin: ["cancelled", "refunded"] } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 as const } },
      ]),
    ]);

    return {
      users: {
        total: totalUsers,
        buyers,
        sellers,
        admins,
        newToday,
      },
      orders: {
        total: totalOrders,
        todayCount: todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        avgOrderValue: avgOrderResult[0]?.avg || 0,
      },
      products: {
        total: totalProducts,
        published: publishedProducts,
        flagged: flaggedProducts,
      },
      reviews: {
        total: totalReviews,
        averageRating: avgRatingResult[0]?.avg || 0,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        daily: dailyRevenue.map((e) => ({ date: e._id, amount: e.amount })),
      },
    };
  }
}

export const adminService = new AdminService();
