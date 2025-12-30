import crypto from "crypto";
import { AppError } from "./AppError";
import { logger } from "./logger";

/**
 * Have I Been Pwned breached-password check (k-anonymity model).
 *
 * Only the first 5 hex characters of the SHA-1 hash are sent to the HIBP range
 * API; suffixes are matched locally, so the full hash never leaves the server.
 * See: https://haveibeenpwned.com/API/v3#PwnedPasswords
 *
 * Fail-open: an unreachable HIBP is logged and the password allowed, so a
 * third-party outage cannot block legitimate signups. The rest of the password
 * policy (length, complexity, history) still applies.
 */
const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const REQUEST_TIMEOUT_MS = 3000;

export async function isPasswordBreached(password: string): Promise<boolean> {
  // Skip the external call in tests so the suite stays deterministic and offline.
  if (process.env.NODE_ENV === "test") return false;

  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      // Add-Padding hides the true result-set size from a network observer.
      headers: { "Add-Padding": "true", "User-Agent": "NEPON-Security" },
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn("HIBP check skipped — non-OK response", { status: res.status });
      return false;
    }
    const body = await res.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, countStr] = line.trim().split(":");
      if (hashSuffix === suffix && Number(countStr) > 0) {
        return true;
      }
    }
    return false;
  } catch (err) {
    logger.warn("HIBP check skipped — request failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false; // fail-open
  } finally {
    clearTimeout(timeout);
  }
}

/** Throws a 400 if the password appears in a known breach. */
export async function assertPasswordNotBreached(password: string): Promise<void> {
  if (await isPasswordBreached(password)) {
    throw AppError.badRequest(
      "This password has appeared in a known data breach and cannot be used. Please choose a different one.",
    );
  }
}
