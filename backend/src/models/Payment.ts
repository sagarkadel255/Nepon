import mongoose, { Schema, Document } from "mongoose";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  provider: "stripe" | "esewa" | "khalti";
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  webhookVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    provider: { type: String, enum: ["stripe", "esewa", "khalti"], required: true },
    providerPaymentId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NPR" },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
    },
    webhookVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

paymentSchema.index({ providerPaymentId: 1 });

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
