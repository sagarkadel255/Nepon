import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),

  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string(),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Dedicated symmetric key for field-level encryption (TOTP secrets, PII),
  // kept independent from the JWT signing secrets. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_KEY: z.string().min(32),

  EMAIL_HOST: z.string().default("smtp.ethereal.email"),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().default(""),
  EMAIL_PASS: z.string().default(""),
  EMAIL_FROM: z.string().email().default("noreply@nepon.com"),

  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  AI_ENGINE_URL: z.string().url().default("http://localhost:8000"),

  TOTP_ISSUER: z.string().default("NEPON"),

  // Google OAuth 2.0 — leave empty to disable social login
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  // Route the callback through the frontend origin so the session cookies are set
  // for the browser's origin (the Next.js dev server proxies /api to the backend).
  GOOGLE_CALLBACK_URL: z.string().url().default("http://localhost:3000/api/auth/google/callback"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
