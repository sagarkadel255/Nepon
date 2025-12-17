import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "buyer" | "seller" | "admin";
export type UserStatus = "active" | "suspended" | "pending_verification";

export interface ITrustedDevice {
  fingerprint: string;
  userAgent: string;
  lastSeen: Date;
}

export interface IUser extends Document {
  email: string;
  passwordHash: string | null;
  authProviders: string[];
  displayName: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
  passwordChangedAt: Date | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  passwordHistory: string[];
  trustedDevices: ITrustedDevice[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    authProviders: { type: [String], default: ["password"] },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending_verification"],
      default: "pending_verification",
      required: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecretEncrypted: { type: String, default: null },
    passwordChangedAt: { type: Date, default: null },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    passwordHistory: { type: [String], default: [] },
    trustedDevices: {
      type: [{
        fingerprint: { type: String, required: true },
        userAgent: { type: String, default: "" },
        lastSeen: { type: Date, default: Date.now },
      }],
      default: [],
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
