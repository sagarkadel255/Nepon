import mongoose from "mongoose";
import { Review, IReview } from "../../models/Review";
import { Product } from "../../models/Product";
import { Order, IOrder } from "../../models/Order";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";

export class ReviewsService {
  async createReview(
    buyerId: string,
    orderId: string,
    productId: string,
    rating: number,
    comment: string,
  ): Promise<IReview> {
    const order = await Order.findOne({
      _id: orderId,
      buyerId,
      status: { $in: ["delivered", "completed"] },
    });

    if (!order) {
      throw AppError.badRequest("You can only review products from delivered or completed orders");
    }

    const orderItem = order.items.find(
      (item) => item.productId.toString() === productId,
    );

    if (!orderItem) {
      throw AppError.badRequest("This product was not in your order");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw AppError.notFound("Product not found");
    }

    if (product.sellerId.toString() === buyerId) {
      throw AppError.forbidden("You cannot review your own product");
    }

    const existingReview = await Review.findOne({ orderId, productId });
    if (existingReview) {
      throw AppError.conflict("You have already reviewed this product from this order");
    }

    const review = await Review.create({
      orderId: new mongoose.Types.ObjectId(orderId),
      productId: new mongoose.Types.ObjectId(productId),
      buyerId: new mongoose.Types.ObjectId(buyerId),
      rating,
      comment,
      status: "visible",
    });

    await this.recalculateProductRating(productId);

    return review;
  }

  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sort: string = "newest",
  ): Promise<{ reviews: IReview[]; total: number; page: number; pages: number }> {
    const product = await Product.findById(productId);
    if (!product) {
      throw AppError.notFound("Product not found");
    }

    const filter = { productId, status: "visible" as const };

    let sortOption: Record<string, 1 | -1>;
    switch (sort) {
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "highest":
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case "lowest":
        sortOption = { rating: 1, createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("buyerId", "displayName")
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return {
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getMyReviews(
    buyerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ reviews: IReview[]; total: number; page: number; pages: number }> {
    const filter = { buyerId, status: { $ne: "removed" as const } };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("productId", "title slug images")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return {
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async updateReview(
    reviewId: string,
    buyerId: string,
    updates: { rating?: number; comment?: string },
  ): Promise<IReview> {
    const review = await Review.findOne({ _id: reviewId, buyerId });

    if (!review) {
      throw AppError.notFound("Review not found or you do not own it");
    }

    if (review.status === "removed") {
      throw AppError.badRequest("Cannot update a removed review");
    }

    if (updates.rating !== undefined) review.rating = updates.rating;
    if (updates.comment !== undefined) review.comment = updates.comment;

    await review.save();

    if (updates.rating !== undefined) {
      await this.recalculateProductRating(review.productId.toString());
    }

    return review;
  }

  async deleteReview(reviewId: string, buyerId: string): Promise<void> {
    const review = await Review.findOne({ _id: reviewId, buyerId });

    if (!review) {
      throw AppError.notFound("Review not found or you do not own it");
    }

    review.status = "removed";
    await review.save();

    await this.recalculateProductRating(review.productId.toString());
  }

  async flagReview(reviewId: string, adminId: string): Promise<IReview> {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw AppError.notFound("Review not found");
    }

    if (review.status === "removed") {
      throw AppError.badRequest("Cannot flag a removed review");
    }

    review.status = "flagged";
    await review.save();

    return review;
  }

  async removeReview(reviewId: string, adminId: string): Promise<void> {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw AppError.notFound("Review not found");
    }

    review.status = "removed";
    await review.save();

    await this.recalculateProductRating(review.productId.toString());
  }

  private async recalculateProductRating(productId: string): Promise<void> {
    const result = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), status: "visible" } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = result[0] || { avgRating: 0, count: 0 };

    await Product.findByIdAndUpdate(productId, {
      ratingAverage: Math.round(stats.avgRating * 10) / 10,
      ratingCount: stats.count,
    });
  }
}

export const reviewsService = new ReviewsService();
