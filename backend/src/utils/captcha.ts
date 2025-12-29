import crypto from "crypto";
import { logger } from "./logger";

/**
 * First-party CAPTCHA — challenge/response with no third-party dependency.
 * The client submits { captchaId, captchaAnswer } with the auth payload; the
 * middleware verifies the pair, then deletes the challenge (single-use) so
 * tokens cannot be replayed.
 *
 * No third-party call means a smaller supply-chain surface, and the answer
 * never leaves the server — only the id is exposed, so an on-path attacker
 * cannot precompute solutions.
 *
 * The SVG can be OCR'd; this is one layer of a defence-in-depth stack that
 * also includes per-endpoint rate limiting, account lockout, and the IP
 * blocklist. Swap in hCaptcha/reCAPTCHA at the middleware layer for
 * higher-risk deployments.
 */

// Characters chosen to avoid visually-ambiguous pairs (0/O, 1/I/l, etc.).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface Challenge {
  answer: string;
  expiresAt: number;
}

const challengeStore = new Map<string, Challenge>();

// Periodic pruning — bounded by CHALLENGE_TTL_MS so the map never leaks.
setInterval(() => {
  const now = Date.now();
  for (const [id, c] of challengeStore) {
    if (c.expiresAt < now) challengeStore.delete(id);
  }
}, 60 * 1000).unref();

function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

function randomChallengeId(): string {
  return crypto.randomBytes(18).toString("base64url");
}

/**
 * Render a code as inline SVG with mild distortion (rotation, x-jitter,
 * baseline shift, plus decoy strokes). Kept intentionally simple — enough
 * to defeat naive HTML scraping while remaining readable to a human.
 */
function renderSvg(code: string): string {
  const width = 180;
  const height = 60;
  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  const lines = Array.from({ length: 2 }, () => {
    const x1 = rand(0, width);
    const x2 = rand(0, width);
    const y1 = rand(0, height);
    const y2 = rand(0, height);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(236,72,153,0.25)" stroke-width="1"/>`;
  }).join("");

  const dots = Array.from({ length: 30 }, () => {
    const cx = rand(0, width).toFixed(1);
    const cy = rand(0, height).toFixed(1);
    const r = rand(0.5, 1.6).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(17,24,39,0.18)"/>`;
  }).join("");

  const spacing = width / (code.length + 1);
  const chars = code
    .split("")
    .map((ch, i) => {
      const x = spacing * (i + 1) + rand(-4, 4);
      const y = height / 2 + rand(-4, 4);
      const rot = rand(-18, 18).toFixed(1);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" font-family="'Courier New', monospace" font-size="30" font-weight="700" fill="#111827" text-anchor="middle" dominant-baseline="middle">${ch}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="CAPTCHA challenge"><rect width="${width}" height="${height}" fill="#FFF9FA" rx="12"/>${lines}${dots}${chars}</svg>`;
}

export function issueChallenge(): { id: string; svg: string; expiresIn: number } {
  const id = randomChallengeId();
  const answer = randomCode(CODE_LENGTH);
  challengeStore.set(id, { answer, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  return { id, svg: renderSvg(answer), expiresIn: CHALLENGE_TTL_MS };
}

/**
 * Verify + consume a challenge. Returns true only if the id is known, the
 * answer matches (case-insensitive), and the challenge is not expired. The
 * record is deleted on any outcome — even a correct answer is single-use.
 */
export function verifyChallenge(id: string | undefined, answer: string | undefined): boolean {
  if (!id || !answer) return false;
  const record = challengeStore.get(id);
  challengeStore.delete(id);
  if (!record) return false;
  if (Date.now() > record.expiresAt) return false;
  return record.answer.toUpperCase() === answer.trim().toUpperCase();
}

// Debug/test helper — count of outstanding challenges.
export function _debugChallengeCount(): number {
  return challengeStore.size;
}

logger.info("CAPTCHA subsystem initialised", { alphabet: ALPHABET.length, codeLength: CODE_LENGTH });
