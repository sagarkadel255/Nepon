import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: mongoose.Types.ObjectId;
  metadata: Record<string, unknown>;
  ip: string;
  result: "success" | "failure";
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, required: true },
    result: { type: String, enum: ["success", "failure"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ actorId: 1, createdAt: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
