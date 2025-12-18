import mongoose, { Schema, Document } from "mongoose";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface ISellerProfile extends Document {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  businessDescription: string;
  verificationStatus: VerificationStatus;
  approvedBy: mongoose.Types.ObjectId | null;
  approvedAt: Date | null;
  payoutMethod: {
    type: string;
    detailsEncrypted: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const sellerProfileSchema = new Schema<ISellerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 200 },
    businessDescription: { type: String, required: true, maxlength: 2000 },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    payoutMethod: {
      type: {
        type: String,
        default: "",
      },
      detailsEncrypted: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true },
);

sellerProfileSchema.index({ verificationStatus: 1 });

export const SellerProfile = mongoose.model<ISellerProfile>("SellerProfile", sellerProfileSchema);
