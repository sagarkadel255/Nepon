import crypto from "crypto";
import { env } from "../config/env";

/**
 * Application-level field encryption (AES-256-GCM) for sensitive data we must
 * read back in plaintext (TOTP secrets, shipping PII). Passwords are NOT
 * encrypted here — they are one-way hashed with bcrypt in the auth service.
 *
 * Key separation: derived from the dedicated ENCRYPTION_KEY secret, not
 * JWT_SECRET, so rotating or leaking one does not compromise the other.
 *
 * Stored format: "<ivHex>:<authTagHex>:<cipherTextHex>"
 */
const ALGO = "aes-256-gcm";
const KEY_SALT = "nepon-field-encryption-v1";
const IV_BYTES = 12; // 96-bit nonce is the GCM standard

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (!cachedKey) {
    cachedKey = crypto.scryptSync(env.ENCRYPTION_KEY, KEY_SALT, 32);
  }
  return cachedKey;
}

/** True when `value` is already in our "iv:tag:ct" ciphertext format. */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p) && p.length > 0);
}

export function encryptField(plainText: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a value produced by `encryptField`. Inputs not in the ciphertext
 * format (e.g. legacy plaintext records) are returned unchanged so historical
 * data keeps rendering.
 */
export function decryptField(value: string): string {
  if (!value || !isEncrypted(value)) return value;
  const [ivHex, authTagHex, cipherHex] = value.split(":");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
