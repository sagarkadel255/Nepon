import mongoose, { Schema, Document } from "mongoose";

export type NotificationType =
  | "order_status"
  | "security"
  | "moderation"
  | "seller_approval"
  | "review"
  | "system";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["order_status", "security", "moderation", "seller_approval", "review", "system"],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    data: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
