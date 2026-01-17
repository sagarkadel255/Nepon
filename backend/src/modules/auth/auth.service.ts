import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { env } from "../../config/env";
import { User, IUser, UserRole } from "../../models/User";
import { RefreshToken, IRefreshToken } from "../../models/RefreshToken";
import { LoginHistory, LoginOutcome } from "../../models/LoginHistory";
import { AuditLog } from "../../models/AuditLog";
import { VerificationToken, TokenType } from "../../models/VerificationToken";
import { SecurityEvent } from "../../models/SecurityEvent";
import { Order } from "../../models/Order";
import { Review } from "../../models/Review";
import Cart from "../../models/Cart";
import { Wishlist } from "../../models/Wishlist";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { addToBlocklist } from "../../utils/redis";
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from "../../utils/email";
import { encryptField, decryptField } from "../../utils/crypto";
import { assertPasswordNotBreached } from "../../utils/hibp";
import { OAuth2Client } from "google-auth-library";

const BCRYPT_COST = 12;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_DAYS = 7;
// NIST SP 800-63B leaves password expiry to policy; we enforce a 90-day
// rotation to bound exposure of leaked credentials.
const PASSWORD_MAX_AGE_DAYS = 90;

/**
 * Derive a stable device fingerprint from the client user-agent and the
 * network prefix of the IP. The full IP is deliberately truncated — mobile
 * clients rotate through their ISP pool, so exact-match binding would flag
 * every legitimate reconnection as a new device. A /24 prefix keeps the
 * signal (which network you're on) without penalising IP churn.
 */
function computeDeviceFingerprint(userAgent: string, ip: string): string {
  const ipPrefix = ip.split(".").slice(0, 3).join(".") || ip;
  return crypto.createHash("sha256").update(`${userAgent}|${ipPrefix}`).digest("hex");
}

/**
 * Record the calling device against the user's trusted-device list.
 * First-time devices trigger a SecurityEvent (real-time monitoring hook)
 * so admins can spot geographically improbable logins; repeat devices
 * just refresh `lastSeen`. Trusted-device count is capped so an attacker
 * cannot grow the list without bound.
 */
async function bindDevice(user: IUser, ip: string, userAgent: string): Promise<boolean> {
  const fingerprint = computeDeviceFingerprint(userAgent, ip);
  const existing = user.trustedDevices?.find((d) => d.fingerprint === fingerprint);

  if (existing) {
    existing.lastSeen = new Date();
    await user.save();
    return false;
  }

  await SecurityEvent.create({
    userId: user._id,
    type: "new_device_login",
    ip,
    userAgent,
    metadata: { fingerprintPrefix: fingerprint.slice(0, 12) },
  });

  const MAX_TRUSTED_DEVICES = 10;
  const updated = [
    ...(user.trustedDevices || []),
    { fingerprint, userAgent, lastSeen: new Date() },
  ].slice(-MAX_TRUSTED_DEVICES);
  user.trustedDevices = updated;
  await user.save();
  logger.info("New device recorded for user", { userId: user._id.toString(), ip });
  return true;
}

function isPasswordExpired(user: IUser): boolean {
  if (!user.passwordHash) return false; // social-only accounts never expire
  const changedAt = user.passwordChangedAt ?? user.createdAt;
  if (!changedAt) return false;
  const ageMs = Date.now() - new Date(changedAt).getTime();
  return ageMs > PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

// Crypto helpers
function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

function getTokenExpiry(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// TOTP secret encryption
// MFA secrets use the shared AES-256-GCM field-encryption helper, keyed from
// the dedicated ENCRYPTION_KEY secret (not JWT_SECRET) so signing and
// encryption keys stay independent.
// NOTE: secrets enrolled before this change were encrypted with a key derived
// from JWT_SECRET and can no longer be decrypted — affected users must re-enrol MFA.
const encryptSecret = encryptField;
const decryptSecret = decryptField;

// JWT
export interface TokenPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export function generateAccessToken(user: IUser): string {
  const payload: TokenPayload = { sub: user._id.toString(), role: user.role, email: user.email };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }
}

export function generateRefreshToken(user: IUser): string {
  const payload: TokenPayload = { sub: user._id.toString(), role: user.role, email: user.email };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_DAYS}d` });
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Account lockout
function isLocked(user: IUser): boolean {
  return !!user.lockedUntil && user.lockedUntil > new Date();
}

async function recordFailedLogin(user: IUser, email: string, ip: string, userAgent: string) {
  user.failedLoginCount += 1;
  if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
    user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    logger.warn("Account locked due to failed login attempts", {
      userId: user._id.toString(),
      email,
    });
  }
  await user.save();
  await recordLoginHistory(user._id, email, ip, userAgent, "bad_password");
}

async function resetFailedLogins(user: IUser) {
  if (user.failedLoginCount > 0 || user.lockedUntil) {
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await user.save();
  }
}

// Login history
async function recordLoginHistory(
  userId: IUser["_id"] | null,
  email: string,
  ip: string,
  userAgent: string,
  outcome: LoginOutcome,
) {
  await LoginHistory.create({ userId, emailAttempted: email, ip, userAgent, outcome });
}

// Refresh token management
async function storeRefreshToken(
  userId: string,
  rawToken: string,
  ip: string,
  userAgent: string,
): Promise<IRefreshToken> {
  return RefreshToken.create({
    userId,
    tokenHash: sha256(rawToken),
    deviceInfo: { ip, userAgent },
    issuedAt: new Date(),
    expiresAt: getTokenExpiry(REFRESH_TOKEN_DAYS),
  });
}

async function revokeRefreshToken(tokenHash: string) {
  await RefreshToken.findOneAndUpdate({ tokenHash }, { revokedAt: new Date() });
}

// Registration
export interface RegisterResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<RegisterResult> {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw AppError.conflict("An account with this email already exists");
  }

  // Reject credentials known to be compromised (in addition to the complexity
  // policy enforced by the Zod schema).
  await assertPasswordNotBreached(password);

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    displayName,
    // Self-service signups are always buyers; never trust a client-supplied role.
    role: "buyer",
    authProviders: ["password"],
    status: "pending_verification",
    isEmailVerified: false,
  });

  const rawToken = generateToken();
  await VerificationToken.create({
    userId: user._id,
    tokenHash: sha256(rawToken),
    type: "email_verification",
    expiresAt: getTokenExpiry(1),
  });

  const verifyUrl = `${env.FRONTEND_URL}/verify-email/${rawToken}`;
  const emailContent = buildVerificationEmail(verifyUrl);
  await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await storeRefreshToken(user._id.toString(), refreshToken, "", "");

  logger.info("User registered", { userId: user._id.toString(), email, role: "buyer" });

  return { user, accessToken, refreshToken };
}

// Login
export interface LoginResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
  requiresMFA: boolean;
  passwordExpired?: boolean;
  // True when an admin has authenticated but has not yet enrolled MFA. They get
  // a session (so they can reach /auth/mfa/enable) but admin routes stay blocked
  // by requireMfaForAdmin until MFA is on.
  requiresMFASetup?: boolean;
}

export async function login(
  email: string,
  password: string,
  ip: string,
  userAgent: string,
  totpCode?: string,
): Promise<LoginResult> {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    await recordLoginHistory(null, email, ip, userAgent, "unknown_email");
    throw AppError.unauthorized("Invalid email or password");
  }

  if (user.status === "suspended") {
    await recordLoginHistory(user._id, email, ip, userAgent, "bad_password");
    throw AppError.forbidden("This account has been suspended");
  }

  if (isLocked(user)) {
    await recordLoginHistory(user._id, email, ip, userAgent, "account_locked");
    const minutesLeft = Math.ceil(
      (user.lockedUntil!.getTime() - Date.now()) / (60 * 1000),
    );
    throw AppError.tooManyRequests(
      `Account is locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}`,
    );
  }

  if (!user.passwordHash) {
    throw AppError.badRequest("This account uses social login. Please sign in with Google");
  }

  const passwordValid = await comparePassword(password, user.passwordHash);
  if (!passwordValid) {
    await recordFailedLogin(user, email, ip, userAgent);
    throw AppError.unauthorized("Invalid email or password");
  }

  // Enforce password expiry AFTER a successful credential + lock/status check
  // so we don't reveal password validity to an attacker via a different code path.
  if (isPasswordExpired(user)) {
    await recordLoginHistory(user._id, email, ip, userAgent, "success");
    return {
      user,
      accessToken: "",
      refreshToken: "",
      requiresMFA: false,
      passwordExpired: true,
    };
  }

  if (user.mfaEnabled) {
    if (!totpCode) {
      return { user, accessToken: "", refreshToken: "", requiresMFA: true };
    }
    if (!user.mfaSecretEncrypted) {
      throw AppError.internal("MFA secret not found. Please contact support");
    }
    const decryptedSecret = decryptSecret(user.mfaSecretEncrypted);
    const mfaVerified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: "base32",
      token: totpCode,
      window: 1,
    });
    if (!mfaVerified) {
      await recordLoginHistory(user._id, email, ip, userAgent, "mfa_failed");
      throw AppError.unauthorized("Invalid MFA code");
    }
  }

  await resetFailedLogins(user);
  await recordLoginHistory(user._id, email, ip, userAgent, "success");
  await bindDevice(user, ip, userAgent);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await storeRefreshToken(user._id.toString(), refreshToken, ip, userAgent);

  logger.info("User logged in", { userId: user._id.toString(), email });

  // Admins are required to have MFA. If one somehow logs in without it enabled,
  // flag the session so the client can force enrolment; admin routes remain
  // blocked by requireMfaForAdmin regardless of what the client does.
  const requiresMFASetup = user.role === "admin" && !user.mfaEnabled;

  return { user, accessToken, refreshToken, requiresMFA: false, requiresMFASetup };
}

// Data portability export (GDPR Art. 20)
// Returns a machine-readable snapshot of every record the platform holds about
// the authenticated user. Called by GET /auth/me/export.
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  // Redact all authentication-material fields — the export is user-facing,
  // and reversing a hash back to a password is never useful to the subject.
  const user = await User
    .findById(userId)
    .select("-passwordHash -passwordHistory -mfaSecretEncrypted -__v")
    .lean();
  if (!user) throw AppError.notFound("User not found");

  const [orders, reviews, cart, wishlist, loginHistory, auditLog] = await Promise.all([
    Order.find({ buyerId: userId }).select("-__v").lean(),
    Review.find({ buyerId: userId }).select("-__v").lean(),
    Cart.findOne({ userId }).select("-__v").lean(),
    Wishlist.findOne({ userId }).select("-__v").lean(),
    LoginHistory.find({ userId }).select("-__v").sort({ createdAt: -1 }).limit(200).lean(),
    AuditLog.find({ actorId: userId }).select("-__v").sort({ createdAt: -1 }).limit(200).lean(),
  ]);

  // `.lean()` bypasses the Order schema getters, so decrypt shipping PII here so
  // the data subject receives their address in plaintext (it is their own data).
  const decryptedOrders = orders.map((o: any) => {
    if (o.shippingAddress) {
      for (const field of ["fullName", "phone", "line1", "city", "district"]) {
        if (typeof o.shippingAddress[field] === "string") {
          o.shippingAddress[field] = decryptField(o.shippingAddress[field]);
        }
      }
    }
    return o;
  });

  return {
    exportedAt: new Date().toISOString(),
    subject: user,
    orders: decryptedOrders,
    reviews,
    cart,
    wishlist,
    loginHistory,
    auditLog,
    notice:
      "This document contains every record NEPON holds about you. Under GDPR Art. 20, you may request a copy at any time. Retain it securely — it contains order history and login metadata.",
  };
}

// Google OAuth 2.0 (Authorization Code flow)
let googleClient: OAuth2Client | null = null;

export function isGoogleAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function getGoogleClient(): OAuth2Client {
  if (!isGoogleAuthConfigured()) {
    throw AppError.internal("Google sign-in is not configured");
  }
  if (!googleClient) {
    googleClient = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_CALLBACK_URL,
    );
  }
  return googleClient;
}

// Build the Google consent-screen URL. `state` is an anti-CSRF nonce echoed back.
export function getGoogleAuthUrl(state: string): string {
  return getGoogleClient().generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
  });
}

export interface OAuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export async function loginWithGoogle(
  code: string,
  ip: string,
  userAgent: string,
): Promise<OAuthResult> {
  const client = getGoogleClient();

  // 1) Exchange the single-use authorization code for Google tokens.
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw AppError.unauthorized("Google did not return an identity token");
  }

  // 2) Verify the ID token's signature and audience, then read the trusted claims.
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw AppError.unauthorized("Google account has no verified email");
  }

  const email = payload.email.toLowerCase();
  const displayName = payload.name || email.split("@")[0];

  // 3) Link to an existing account (by verified email) or provision a new one.
  let user = await User.findOne({ email });

  if (user) {
    if (user.status === "suspended") {
      throw AppError.forbidden("This account has been suspended");
    }
    if (!user.authProviders.includes("google")) {
      user.authProviders.push("google");
    }
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      if (user.status === "pending_verification") user.status = "active";
    }
    await user.save();
  } else {
    user = await User.create({
      email,
      passwordHash: null,
      authProviders: ["google"],
      displayName,
      role: "buyer",
      status: "active",
      isEmailVerified: true,
    });
  }

  await resetFailedLogins(user);
  await recordLoginHistory(user._id, email, ip, userAgent, "success");
  await bindDevice(user, ip, userAgent);

  // 4) Issue our own first-party session tokens (same path as password login).
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await storeRefreshToken(user._id.toString(), refreshToken, ip, userAgent);

  logger.info("User logged in via Google", { userId: user._id.toString(), email });

  return { user, accessToken, refreshToken };
}

// Logout
export async function logout(refreshToken?: string, accessToken?: string): Promise<void> {
  if (refreshToken) {
    const tokenHash = sha256(refreshToken);
    await revokeRefreshToken(tokenHash);
  }

  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
      if (decoded && decoded.exp) {
        const expiresInSeconds = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
        if (expiresInSeconds > 0) {
          await addToBlocklist(accessToken, expiresInSeconds);
        }
      }
    } catch (err) {
      // Ignore token decode errors
    }
  }
}

// Refresh token rotation
export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function rotateRefreshToken(
  oldRefreshToken: string,
  ip: string,
  userAgent: string,
): Promise<RefreshResult> {
  const tokenHash = sha256(oldRefreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  if (!storedToken) {
    logger.error("Refresh token not found — possible reuse", { tokenHash });
    throw AppError.unauthorized("Invalid refresh token");
  }

  if (storedToken.revokedAt) {
    logger.error("Refresh token reuse detected", { userId: storedToken.userId.toString() });
    await RefreshToken.updateMany(
      { userId: storedToken.userId, revokedAt: null },
      { revokedAt: new Date() },
    );
    throw AppError.unauthorized("Invalid refresh token — session revoked");
  }

  if (new Date() > storedToken.expiresAt) {
    throw AppError.unauthorized("Refresh token expired");
  }

  const user = await User.findById(storedToken.userId);
  if (!user) throw AppError.unauthorized("User not found");

  const newRefreshToken = generateRefreshToken(user);
  storedToken.revokedAt = new Date();
  storedToken.replacedByTokenHash = sha256(newRefreshToken);
  await storedToken.save();

  await storeRefreshToken(storedToken.userId.toString(), newRefreshToken, ip, userAgent);

  const accessToken = generateAccessToken(user);

  return { accessToken, refreshToken: newRefreshToken };
}

// Get profile
export async function getProfile(userId: string): Promise<IUser> {
  const user = await User.findById(userId).select("-passwordHash -mfaSecretEncrypted -__v");
  if (!user) throw AppError.notFound("User not found");
  return user;
}

// Update profile
export async function updateProfile(
  userId: string,
  updates: { displayName?: string; email?: string },
): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("User not found");

  if (updates.displayName) user.displayName = updates.displayName;

  if (updates.email && updates.email.toLowerCase() !== user.email) {
    const emailTaken = await User.findOne({ email: updates.email.toLowerCase() });
    if (emailTaken) throw AppError.conflict("This email is already in use");

    user.email = updates.email.toLowerCase();
    user.isEmailVerified = false;
    user.status = "pending_verification";

    const rawToken = generateToken();
    await VerificationToken.create({
      userId: user._id,
      tokenHash: sha256(rawToken),
      type: "email_verification",
      expiresAt: getTokenExpiry(1),
    });
    const verifyUrl = `${env.FRONTEND_URL}/verify-email/${rawToken}`;
    const emailContent = buildVerificationEmail(verifyUrl);
    await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html });
  }

  await user.save();
  return user;
}

// Password history check (last 5 passwords)
const PASSWORD_HISTORY_LIMIT = 5;

async function checkPasswordHistory(newPassword: string, history: string[]): Promise<void> {
  const checks = await Promise.all(
    history.slice(-PASSWORD_HISTORY_LIMIT).map(oldHash => bcrypt.compare(newPassword, oldHash)),
  );
  if (checks.some(Boolean)) {
    throw AppError.badRequest(
      `You cannot reuse any of your last ${PASSWORD_HISTORY_LIMIT} passwords`,
    );
  }
}

// Change password
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("User not found");
  if (!user.passwordHash) throw AppError.badRequest("This account uses social login");

  const valid = await comparePassword(oldPassword, user.passwordHash);
  if (!valid) throw AppError.unauthorized("Current password is incorrect");

  await assertPasswordNotBreached(newPassword);
  await checkPasswordHistory(newPassword, user.passwordHistory || []);

  // Archive current hash before overwriting
  const updatedHistory = [...(user.passwordHistory || []), user.passwordHash].slice(
    -PASSWORD_HISTORY_LIMIT,
  );
  user.passwordHistory = updatedHistory;
  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });

  logger.info("Password changed", { userId });
}

// Email verification
export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = sha256(token);
  const verificationToken = await VerificationToken.findOne({
    tokenHash,
    type: "email_verification",
  });

  if (!verificationToken) throw AppError.badRequest("Invalid verification token");
  if (verificationToken.usedAt) throw AppError.badRequest("Verification token already used");
  if (new Date() > verificationToken.expiresAt) {
    throw AppError.badRequest("Verification token expired");
  }

  const user = await User.findById(verificationToken.userId);
  if (!user) throw AppError.notFound("User not found");

  user.isEmailVerified = true;
  user.status = "active";
  await user.save();

  verificationToken.usedAt = new Date();
  await verificationToken.save();

  logger.info("Email verified", { userId: user._id.toString() });
}

// Forgot password
export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return; // Don't reveal email existence

  await VerificationToken.updateMany(
    { userId: user._id, type: "password_reset", usedAt: null },
    { usedAt: new Date() },
  );

  const rawToken = generateToken();
  await VerificationToken.create({
    userId: user._id,
    tokenHash: sha256(rawToken),
    type: "password_reset",
    expiresAt: getTokenExpiry(0.0417), // ~1 hour
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password/${rawToken}`;
  const emailContent = buildPasswordResetEmail(resetUrl);
  await sendEmail({ to: user.email, subject: emailContent.subject, html: emailContent.html });

  logger.info("Password reset requested", { userId: user._id.toString() });
}

// Reset password
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = sha256(token);
  const verificationToken = await VerificationToken.findOne({
    tokenHash,
    type: "password_reset",
  });

  if (!verificationToken) throw AppError.badRequest("Invalid reset token");
  if (verificationToken.usedAt) throw AppError.badRequest("Reset token already used");
  if (new Date() > verificationToken.expiresAt) {
    throw AppError.badRequest("Reset token expired");
  }

  const user = await User.findById(verificationToken.userId);
  if (!user) throw AppError.notFound("User not found");

  await assertPasswordNotBreached(newPassword);
  await checkPasswordHistory(newPassword, user.passwordHistory || []);

  // Archive current hash before overwriting
  if (user.passwordHash) {
    const updatedHistory = [...(user.passwordHistory || []), user.passwordHash].slice(
      -PASSWORD_HISTORY_LIMIT,
    );
    user.passwordHistory = updatedHistory;
  }
  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  await user.save();

  verificationToken.usedAt = new Date();
  await verificationToken.save();

  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });

  logger.info("Password reset completed", { userId: user._id.toString() });
}

// MFA
export interface MFASecret {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

function verifyTOTP(secretBase32: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token: code,
    window: 1,
  });
}

export async function generateMFASecret(userId: string): Promise<MFASecret> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("User not found");
  if (user.mfaEnabled) throw AppError.badRequest("MFA is already enabled");

  const secret = speakeasy.generateSecret({
    name: `${env.TOTP_ISSUER}:${user.email}`,
    issuer: env.TOTP_ISSUER,
    length: 20,
  });

  // Store encrypted (AES-256-GCM) — reversible so we can verify TOTP later
  user.mfaSecretEncrypted = encryptSecret(secret.base32);
  await user.save();

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url!,
    qrCodeDataUrl,
  };
}

export async function verifyAndEnableMFA(
  userId: string,
  secret: string,
  code: string,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("User not found");
  if (user.mfaEnabled) throw AppError.badRequest("MFA is already enabled");

  const verified = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 1,
  });
  if (!verified) throw AppError.badRequest("Invalid MFA code. Please try again");

  // Confirm the secret matches what we stored
  if (!user.mfaSecretEncrypted) {
    throw AppError.badRequest("No pending MFA setup. Call /mfa/enable first");
  }
  const storedSecret = decryptSecret(user.mfaSecretEncrypted);
  if (storedSecret !== secret) {
    throw AppError.badRequest("Secret mismatch. Please re-enable MFA");
  }

  user.mfaEnabled = true;
  await user.save();

  logger.info("MFA enabled", { userId });
}

export async function disableMFA(
  userId: string,
  password: string,
  totpCode: string,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("User not found");
  if (!user.mfaEnabled) throw AppError.badRequest("MFA is not enabled");
  if (!user.passwordHash) throw AppError.badRequest("This account uses social login");
  if (!user.mfaSecretEncrypted) throw AppError.internal("MFA secret missing. Contact support");

  const passwordValid = await comparePassword(password, user.passwordHash);
  if (!passwordValid) throw AppError.unauthorized("Incorrect password");

  const decryptedSecret = decryptSecret(user.mfaSecretEncrypted);
  const verified = speakeasy.totp.verify({
    secret: decryptedSecret,
    encoding: "base32",
    token: totpCode,
    window: 1,
  });
  if (!verified) throw AppError.unauthorized("Invalid MFA code");

  user.mfaEnabled = false;
  user.mfaSecretEncrypted = null;
  await user.save();

  logger.info("MFA disabled", { userId });
}

// Audit logging
export async function logAuditEvent(params: {
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ip: string;
  result: "success" | "failure";
}) {
  await AuditLog.create({
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata ?? {},
    ip: params.ip,
    result: params.result,
  });
}
