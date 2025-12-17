import mongoose, { Schema, Document } from "mongoose";

export type LoginOutcome =
  | "success"
  | "bad_password"
  | "account_locked"
  | "mfa_failed"
  | "unknown_email";

export interface ILoginHistory extends Document {
  userId: mongoose.Types.ObjectId | null;
  emailAttempted: string;
  ip: string;
  userAgent: string;
  outcome: LoginOutcome;
  createdAt: Date;
}

const loginHistorySchema = new Schema<ILoginHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    emailAttempted: { type: String, required: true, lowercase: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    outcome: {
      type: String,
      enum: ["success", "bad_password", "account_locked", "mfa_failed", "unknown_email"],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

loginHistorySchema.index({ userId: 1, createdAt: 1 });
loginHistorySchema.index({ ip: 1, createdAt: 1 });

export const LoginHistory = mongoose.model<ILoginHistory>("LoginHistory", loginHistorySchema);
