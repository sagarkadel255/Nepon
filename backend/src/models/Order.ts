import mongoose, { Schema, Document } from "mongoose";
import { encryptField, decryptField } from "../utils/crypto";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  variantSku: string;
  title: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
}

export interface IShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  district: string;
}

export interface IStatusHistoryEntry {
  status: OrderStatus;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
}

export interface IOrder extends Document {
  orderNumber: string;
  buyerId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  status: OrderStatus;
  statusHistory: IStatusHistoryEntry[];
  totalAmount: number;
  paymentId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    variantSku: { type: String, required: true },
    title: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

// Shipping PII is encrypted at rest (AES-256-GCM) via set/get hooks;
// decryptField passes plaintext through unchanged, so orders written before
// encryption still render correctly.
const encryptedString = {
  type: String,
  required: true,
  set: encryptField,
  get: decryptField,
};

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: encryptedString,
    phone: encryptedString,
    line1: encryptedString,
    city: encryptedString,
    district: encryptedString,
  },
  { _id: false, toObject: { getters: true }, toJSON: { getters: true } },
);

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], required: true, minlength: 1 },
    shippingAddress: { type: shippingAddressSchema, required: true },
    status: {
      type: String,
      enum: ["placed", "confirmed", "shipped", "delivered", "completed", "cancelled", "refunded"],
      default: "placed",
      required: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
  },
  // getters: true so shippingAddress is decrypted in API responses.
  { timestamps: true, toObject: { getters: true }, toJSON: { getters: true } },
);

orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ "items.sellerId": 1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.model<IOrder>("Order", orderSchema);
