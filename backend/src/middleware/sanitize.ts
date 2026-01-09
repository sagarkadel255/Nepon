/**
 * Defence-in-depth input sanitization — strips script/event-handler injection
 * from request bodies and query strings before route logic runs. Zod schemas
 * are the primary defence; this layer also covers new routes added without
 * their own schema.
 *
 * Values are intentionally NOT HTML-encoded here — React auto-escapes on
 * render, and encoding at ingestion corrupts data used in non-HTML contexts
 * (emails, PDFs, JSON APIs).
 */

import { Request, Response, NextFunction } from "express";

// Strip the dangerous construct, keeping surrounding text legible for audit.
const STRIP_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*(?:"[^"]*"|'[^']*'|\S+)/gi, // inline event handlers: onclick=, onload=…
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
];

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    let sanitized = value;
    for (const pattern of STRIP_PATTERNS) {
      sanitized = sanitized.replace(pattern, "");
    }
    return sanitized;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = sanitizeValue(v);
    }
    return result;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === "object") {
      // Cast required because Express types req.query as ParsedQs
      req.query = sanitizeValue(req.query) as typeof req.query;
    }
  } catch {
    // Never block a request due to sanitization errors — let validation catch it
  }
  next();
}
