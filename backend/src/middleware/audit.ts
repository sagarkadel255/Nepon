import { Request } from "express";
import { AuditLog } from "../models/AuditLog";

export async function logAuditAction(
  req: Request,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
  result: "success" | "failure" = "success",
): Promise<void> {
  try {
    const userId = (req as any).user?.sub;
    const userRole = (req as any).user?.role;

    if (!userId) return;

    await AuditLog.create({
      actorId: userId,
      actorRole: userRole,
      action,
      targetType,
      targetId,
      metadata,
      ip: req.ip || req.socket.remoteAddress || "unknown",
      result,
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
