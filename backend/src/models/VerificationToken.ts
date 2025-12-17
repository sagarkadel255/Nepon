import mongoose, { Schema, Document } from "mongoose";

export type TokenType = "email_verification" | "password_reset";

export interface IVerificationToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  type: TokenType;
  expiresAt: Date;
  usedAt: Date | null;
}

const verificationTokenSchema = new Schema<IVerificationToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    type: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

verificationTokenSchema.index({ tokenHash: 1, type: 1 });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationToken = mongoose.model<IVerificationToken>(
  "VerificationToken",
  verificationTokenSchema,
);
