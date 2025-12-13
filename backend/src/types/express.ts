import { Request } from "express";
import { UserRole } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        role: UserRole;
        email: string;
      };
    }
  }
}

export type AuthRequest = Request;

export function getUserId(req: Request): string {
  const userId = (req as any).user?.sub as string;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export function getUserRole(req: Request): UserRole {
  return (req as any).user?.role as UserRole;
}
