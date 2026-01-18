import { z } from "zod";

// NIST SP 800-63B + OWASP recommendations:
// ≥12 chars, upper, lower, digit, special character, no reuse (enforced in service layer)
const PASSWORD_RULES = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character (e.g. !@#$%^&*)");

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: PASSWORD_RULES,
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(100, "Display name must be at most 100 characters")
      .trim(),
    // NOTE: `role` is deliberately NOT accepted from the client. All self-service
    // registrations are created as "buyer". Elevation to "seller" only happens
    // through the admin approval workflow (see admin.approveSeller), and "admin"
    // is never self-assignable. Accepting a client role here was a
    // privilege-escalation hole.
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    totpCode: z.string().length(6, "MFA code must be 6 digits").optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: PASSWORD_RULES,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z
      .string()
      .min(2, "Display name must be at least 2 characters")
      .max(100, "Display name must be at most 100 characters")
      .trim()
      .optional(),
    email: z.string().email("Invalid email address").optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: PASSWORD_RULES,
  }),
  params: z.object({
    token: z.string(),
  }).optional(),
});

export const verifyMFASchema = z.object({
  body: z.object({
    secret: z.string().min(1, "Secret is required"),
    code: z.string().length(6, "MFA code must be 6 digits"),
  }),
});

export const disableMFASchema = z.object({
  body: z.object({
    password: z.string().min(1, "Password is required"),
    totpCode: z.string().length(6, "MFA code must be 6 digits"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>["body"];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
export type VerifyMFAInput = z.infer<typeof verifyMFASchema>["body"];
export type DisableMFAInput = z.infer<typeof disableMFASchema>["body"];
