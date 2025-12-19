import mongoose, { Schema, Document } from "mongoose";

export type SecurityEventType =
  | "rate_limit_trip"
  | "new_device_login"
  | "mfa_failure"
  | "account_locked"
  | "suspicious_activity";

export interface ISecurityEvent extends Document {
  userId: mongoose.Types.ObjectId | null;
  type: SecurityEventType;
  ip: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: {
      type: String,
      enum: ["rate_limit_trip", "new_device_login", "mfa_failure", "account_locked", "suspicious_activity"],
      required: true,
    },
    ip: { type: String, required: true },
    userAgent: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });

export const SecurityEvent = mongoose.model<ISecurityEvent>("SecurityEvent", securityEventSchema);
