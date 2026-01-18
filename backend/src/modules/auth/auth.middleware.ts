import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "./auth.service";
import { AppError } from "../../utils/AppError";
import { isBlocked } from "../../utils/redis";
import { User } from "../../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    // Accept the access token from either the Authorization header (API clients)
    // or the httpOnly `accessToken` cookie (browser SPA — set at login/refresh).
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : (req.cookies?.accessToken as string | undefined);

    if (!token) {
      return next(AppError.unauthorized("No access token provided"));
    }

    if (await isBlocked(token)) {
      return next(AppError.unauthorized("Token has been revoked"));
    }

    const payload = verifyAccessToken(token);

    // DB lookup — ensures suspended/deleted accounts are denied immediately,
    // even if a valid JWT is still in circulation.
    const user = await User.findById(payload.sub).select("status role email displayName deletedAt mfaEnabled").lean();
    if (!user || user.deletedAt) {
      return next(AppError.unauthorized("User account not found"));
    }
    if (user.status === "suspended") {
      return next(AppError.forbidden("Account has been suspended"));
    }

    (req as any).user = {
      sub: payload.sub,
      _id: payload.sub,
      role: user.role,
      email: user.email,
      displayName: (user as any).displayName,
      mfaEnabled: (user as any).mfaEnabled === true,
    };
    next();
  } catch (err) {
    next(err);
  }
}

// Non-blocking auth: populates req.user when a valid session exists, but lets
// unauthenticated requests through (used by guest-capable routes like the cart).
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : (req.cookies?.accessToken as string | undefined);

    if (!token || (await isBlocked(token))) return next();

    let payload: TokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next(); // invalid/expired token — proceed as guest
    }

    const user = await User.findById(payload.sub)
      .select("status role email displayName deletedAt")
      .lean();
    if (user && !user.deletedAt && user.status !== "suspended") {
      (req as any).user = {
        sub: payload.sub,
        _id: payload.sub,
        role: user.role,
        email: user.email,
        displayName: (user as any).displayName,
      };
    }
    next();
  } catch {
    next(); // never block a guest-capable route on auth errors
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return next(AppError.unauthorized("Not authenticated"));
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      return next(AppError.forbidden("Insufficient permissions"));
    }
    next();
  };
}

// Enforces that admin accounts have MFA enabled before they can use privileged
// routes. Admins can still authenticate and reach /auth/mfa/enable (which is not
// guarded here), but every admin endpoint is blocked until MFA is on. Must run
// after `authenticate` so req.user.mfaEnabled is populated.
export function requireMfaForAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user?.role === "admin" && user.mfaEnabled !== true) {
    return next(
      AppError.forbidden("Admin accounts must enable multi-factor authentication before continuing"),
    );
  }
  next();
}
