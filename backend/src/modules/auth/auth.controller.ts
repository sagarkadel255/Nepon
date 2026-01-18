import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  UpdateProfileInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  DisableMFAInput,
} from "./auth.validation";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import crypto from "crypto";

// Helpers
function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

function getUserAgent(req: Request): string {
  return req.headers["user-agent"] || "unknown";
}

function setRefreshCookie(res: Response, token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
}

// Access token is delivered as a short-lived httpOnly cookie so the SPA never has
// to store the JWT in JS (immune to XSS token theft). authenticate() reads it back.
// CSRF is covered by the global double-submit middleware.
function setAccessCookie(res: Response, token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 minutes — matches JWT_ACCESS_EXPIRES_IN
    path: "/api",
  });
}

function clearAccessCookie(res: Response) {
  res.clearCookie("accessToken", { path: "/api" });
}

// Register
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, displayName } = req.body as RegisterInput;
    // Role is intentionally not taken from the request — every self-service
    // signup is a "buyer". Seller access is granted only via admin approval.
    const result = await authService.register(email, password, displayName);

    setRefreshCookie(res, result.refreshToken);
    setAccessCookie(res, result.accessToken);

    res.status(201).json({
      status: "success",
      message: "Registration successful. Please check your email to verify your account.",
      data: {
        user: {
          _id: result.user._id,
          email: result.user.email,
          displayName: result.user.displayName,
          role: result.user.role,
          isEmailVerified: result.user.isEmailVerified,
          mfaEnabled: result.user.mfaEnabled,
        },
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, totpCode } = req.body as LoginInput;
    const ip = getClientIp(req);
    const userAgent = getUserAgent(req);

    const result = await authService.login(email, password, ip, userAgent, totpCode);

    if (result.requiresMFA) {
      res.status(200).json({
        status: "success",
        message: "MFA verification required",
        data: { requiresMFA: true, userId: result.user._id },
      });
      return;
    }

    if (result.passwordExpired) {
      res.status(200).json({
        status: "success",
        message: "Password has expired — please choose a new one.",
        data: { passwordExpired: true, userId: result.user._id },
      });
      return;
    }

    setRefreshCookie(res, result.refreshToken);
    setAccessCookie(res, result.accessToken);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          _id: result.user._id,
          email: result.user.email,
          displayName: result.user.displayName,
          role: result.user.role,
          isEmailVerified: result.user.isEmailVerified,
          mfaEnabled: result.user.mfaEnabled,
        },
        accessToken: result.accessToken,
        requiresMFASetup: result.requiresMFASetup ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Logout
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (refreshToken || accessToken) {
      await authService.logout(refreshToken, accessToken);
    }

    clearRefreshCookie(res);
    clearAccessCookie(res);

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (err) {
    next(err);
  }
}

// Refresh token
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      throw AppError.unauthorized("No refresh token provided");
    }

    const ip = getClientIp(req);
    const userAgent = getUserAgent(req);

    const result = await authService.rotateRefreshToken(token, ip, userAgent);

    setRefreshCookie(res, result.refreshToken);
    setAccessCookie(res, result.accessToken);

    res.status(200).json({
      status: "success",
      data: { accessToken: result.accessToken },
    });
  } catch (err) {
    clearRefreshCookie(res);
    clearAccessCookie(res);
    next(err);
  }
}

// Get me
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub as string;
    if (!userId) throw AppError.unauthorized("Not authenticated");

    const user = await authService.getProfile(userId);

    res.status(200).json({
      status: "success",
      data: {
        user: {
          _id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          mfaEnabled: user.mfaEnabled,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// Update profile
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub as string;
    if (!userId) throw AppError.unauthorized("Not authenticated");

    const updates = req.body as UpdateProfileInput;
    const user = await authService.updateProfile(userId, updates);

    res.status(200).json({
      status: "success",
      message: updates.email
        ? "Profile updated. Please verify your new email address."
        : "Profile updated",
      data: {
        user: {
          _id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          mfaEnabled: user.mfaEnabled,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// Change password
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub as string;
    if (!userId) throw AppError.unauthorized("Not authenticated");

    const { oldPassword, newPassword } = req.body as ChangePasswordInput;
    await authService.changePassword(userId, oldPassword, newPassword);

    clearRefreshCookie(res);

    res.status(200).json({
      status: "success",
      message: "Password changed. Please log in again on all devices.",
    });
  } catch (err) {
    next(err);
  }
}

// Verify email
export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.params.token as string;
    if (!token) throw AppError.badRequest("Verification token is required");

    await authService.verifyEmail(token);

    res.status(200).json({
      status: "success",
      message: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    next(err);
  }
}

// Forgot password
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body as ForgotPasswordInput;
    await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      status: "success",
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
}

// Reset password
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.params.token as string;
    const { password } = req.body as ResetPasswordInput;
    if (!token) throw AppError.badRequest("Reset token is required");

    await authService.resetPassword(token, password);

    res.status(200).json({
      status: "success",
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (err) {
    next(err);
  }
}

// Data export (GDPR Art. 20 portability)
export async function exportMyData(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub as string;
    if (!userId) throw AppError.unauthorized("Not authenticated");

    const bundle = await authService.exportUserData(userId);
    const filename = `nepon-data-export-${new Date().toISOString().split("T")[0]}.json`;

    res
      .status(200)
      .setHeader("Content-Type", "application/json; charset=utf-8")
      .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
      .send(JSON.stringify(bundle, null, 2));
  } catch (err) {
    next(err);
  }
}

// CAPTCHA challenge (public)
import { issueChallenge } from "../../utils/captcha";

export function getCaptcha(_req: Request, res: Response, _next: NextFunction) {
  const challenge = issueChallenge();
  res.status(200).json({
    status: "success",
    data: {
      id: challenge.id,
      svg: challenge.svg,
      expiresIn: challenge.expiresIn,
    },
  });
}

// Google OAuth: start
const GOOGLE_STATE_COOKIE = "g_oauth_state";

export function googleRedirect(req: Request, res: Response, next: NextFunction) {
  try {
    if (!authService.isGoogleAuthConfigured()) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=google_not_configured`);
    }

    // Anti-CSRF: random state stored in a short-lived cookie and echoed via Google.
    // sameSite must be "lax" so the cookie survives the top-level redirect back.
    const state = crypto.randomBytes(16).toString("hex");
    res.cookie(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: "/api/auth",
    });

    return res.redirect(authService.getGoogleAuthUrl(state));
  } catch (err) {
    next(err);
  }
}

// Google OAuth: callback
export async function googleCallback(req: Request, res: Response, _next: NextFunction) {
  const { code, state } = req.query as { code?: string; state?: string };
  const savedState = req.cookies?.[GOOGLE_STATE_COOKIE] as string | undefined;
  res.clearCookie(GOOGLE_STATE_COOKIE, { path: "/api/auth" });

  // Validate the state nonce before doing any work (CSRF + malformed callback guard).
  if (!code || !state || !savedState || state !== savedState) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=google_failed`);
  }

  try {
    const result = await authService.loginWithGoogle(code, getClientIp(req), getUserAgent(req));

    setRefreshCookie(res, result.refreshToken);
    setAccessCookie(res, result.accessToken);

    return res.redirect(`${env.FRONTEND_URL}/`);
  } catch (err) {
    logger.error("Google OAuth callback failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return res.redirect(`${env.FRONTEND_URL}/login?error=google_failed`);
  }
}

// Enable MFA
export async function enableMFA(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub as string;
    if (!userId) throw AppError.unauthorized("Not authenticated");

    const mfaSecret = await authService.generateMFASecret(userId);

    res.status(200).json({
      status: "success",
      data: {
        secret: mfaSecret.secret,
        otpauthUrl: mfaSecret.otpauthUrl,
        qrCodeDataUrl: mfaSecret.qrCodeDataUrl,
        message: "Scan the QR code with your authenticator app, then verify with POST /api/auth/mfa/verify",
      },
    });
  } catch (err) {
    next(err);
  }
}

// Verify MFA
export async function verifyMFA(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub as string;
    if (!userId) throw AppError.unauthorized("Not authenticated");

    const { secret, code } = req.body;
    if (!secret || !code) throw AppError.badRequest("Secret and code are required");

    await authService.verifyAndEnableMFA(userId, secret, code);

    res.status(200).json({
      status: "success",
      message: "MFA enabled successfully",
    });
  } catch (err) {
    next(err);
  }
}

// Disable MFA
export async function disableMFA(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.sub as string;
    if (!userId) throw AppError.unauthorized("Not authenticated");

    const { password, totpCode } = req.body as DisableMFAInput;
    await authService.disableMFA(userId, password, totpCode);

    res.status(200).json({
      status: "success",
      message: "MFA disabled successfully",
    });
  } catch (err) {
    next(err);
  }
}
