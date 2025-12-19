import mongoose, { Schema, Document } from "mongoose";

export type ReviewStatus = "visible" | "flagged" | "removed";

export interface IReview extends Document {
  orderId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 2000, trim: true },
    status: {
      type: String,
      enum: ["visible", "flagged", "removed"],
      default: "visible",
      required: true,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ buyerId: 1 });

export const Review = mongoose.model<IReview>("Review", reviewSchema);
