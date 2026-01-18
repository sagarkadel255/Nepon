import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller";
import { authenticate, authorize, optionalAuthenticate } from "./auth.middleware";
import { verifyCaptcha } from "../../middleware/captcha";
import { validate } from "../../utils/validate";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  disableMFASchema,
} from "./auth.validation";

const router = Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { status: "error", message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: "error", message: "Too many password reset requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { status: "error", message: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post(
  "/register",
  registerLimiter,
  verifyCaptcha,
  validate(registerSchema),
  authController.register,
);

router.post(
  "/login",
  loginLimiter,
  verifyCaptcha,
  validate(loginSchema),
  authController.login,
);

router.post("/refresh", authController.refreshToken);

// Public — issue a fresh single-use CAPTCHA challenge (inline SVG + opaque id).
// The frontend renders the SVG, the user types the answer, both flow back to
// /auth/register or /auth/login where verifyCaptcha consumes them.
router.get("/captcha", authController.getCaptcha);

// Google OAuth 2.0
router.get("/google", authController.googleRedirect);
router.get("/google/callback", authController.googleCallback);

router.get("/verify-email/:token", authController.verifyEmail);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password/:token",
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// Protected routes
// Logout tolerates an invalid/missing session: the whole point of calling it is
// to clear cookies, and blocking that if the token is bad leaves the browser
// stuck in an unauthenticated-but-cookied state.
router.post("/logout", optionalAuthenticate, authController.logout);

router.get("/me", authenticate, authController.getMe);

// GDPR Art. 20 data portability — user downloads a full snapshot of their data.
router.get("/me/export", authenticate, authController.exportMyData);

router.put(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  authController.updateProfile,
);

router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

router.post("/mfa/enable", authenticate, authController.enableMFA);

router.post("/mfa/verify", authenticate, authController.verifyMFA);

router.post(
  "/mfa/disable",
  authenticate,
  validate(disableMFASchema),
  authController.disableMFA,
);

export default router;
