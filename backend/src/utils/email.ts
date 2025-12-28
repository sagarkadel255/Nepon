import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// The transporter is built lazily so that, in development, we can fall back to a
// disposable Ethereal test inbox when no real SMTP credentials are configured.
let transporterPromise: Promise<Transporter> | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  const hasCredentials = Boolean(env.EMAIL_USER && env.EMAIL_PASS);

  if (hasCredentials) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_PORT === 465,
        auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
      }),
    );
    return transporterPromise;
  }

  // No SMTP credentials — in production this is a misconfiguration we surface
  // loudly; in development we create an Ethereal test account so verification
  // and password-reset links stay viewable through a logged preview URL.
  if (env.NODE_ENV === "production") {
    logger.warn(
      "EMAIL_USER/EMAIL_PASS are not set — outbound email will fail. Configure SMTP credentials.",
    );
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_PORT === 465,
      }),
    );
    return transporterPromise;
  }

  transporterPromise = nodemailer
    .createTestAccount()
    .then((testAccount) => {
      logger.warn(
        "No SMTP credentials configured — using an Ethereal dev inbox. " +
          "Password-reset and verification emails will be logged as clickable preview URLs.",
      );
      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    })
    .catch((err) => {
      // Ethereal unreachable (e.g. offline) — degrade to a no-network transport that
      // just serialises the message so the flow does not hang.
      logger.error("Could not create Ethereal dev inbox", {
        error: err instanceof Error ? err.message : String(err),
      });
      return nodemailer.createTransport({ jsonTransport: true });
    });

  return transporterPromise;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      // Dev only — the preview URL opens the sent email (with reset/verify link).
      logger.info("Email sent — open the preview to view it", {
        to: options.to,
        subject: options.subject,
        preview: previewUrl,
      });
    } else {
      logger.info("Email sent", { to: options.to, subject: options.subject });
    }
  } catch (err) {
    // Intentionally swallowed: callers (e.g. forgot-password) must not reveal whether
    // an address exists. The error is logged for operators.
    logger.error("Email send failed", {
      to: options.to,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function buildVerificationEmail(verificationUrl: string): { subject: string; html: string } {
  return {
    subject: "Verify your NEPON email",
    html: `
      <h2>Welcome to NEPON!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link expires in 24 hours.</p>
      <p>If you did not create an account, please ignore this email.</p>
    `,
  };
}

export function buildPasswordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset your NEPON password",
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `,
  };
}
