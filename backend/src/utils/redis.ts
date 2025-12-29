import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

let redis: Redis | null = null;

try {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
  redis.on("connect", () => logger.info("Redis connected"));
  redis.on("error", (err) => logger.warn("Redis unavailable, using fallback", { error: err.message }));
} catch {
  logger.warn("Redis not configured, running without caching");
}

async function getRedis(): Promise<Redis | null> {
  if (!redis) return null;
  try {
    await redis.connect();
    return redis;
  } catch {
    return null;
  }
}

// Rate limiting helpers (memory fallback)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function incrementRateLimit(key: string, windowMs: number): Promise<{ count: number; ttl: number }> {
  const r = await getRedis();
  if (r) {
    try {
      const fullKey = `rl:${key}`;
      const now = Date.now();
      const windowStart = now - windowMs;
      await r.zremrangebyscore(fullKey, 0, windowStart);
      await r.zadd(fullKey, now, `${now}-${Math.random().toString(36).slice(2)}`);
      const count = await r.zcard(fullKey);
      await r.pexpire(fullKey, windowMs);
      const ttl = await r.pttl(fullKey);
      return { count, ttl: Math.max(0, ttl) };
    } catch { /* fall through to memory */ }
  }

  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || now > existing.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { count: 1, ttl: windowMs };
  }
  existing.count += 1;
  return { count: existing.count, ttl: existing.resetAt - now };
}

// Refresh token blocklist (memory fallback)
const blocklist = new Map<string, number>();

export async function addToBlocklist(token: string, expiresInSeconds: number): Promise<void> {
  const r = await getRedis();
  if (r) {
    try { await r.setex(`blocklist:${token}`, expiresInSeconds, "1"); return; } catch {}
  }
  blocklist.set(token, Date.now() + expiresInSeconds * 1000);
}

export async function isBlocked(token: string): Promise<boolean> {
  const r = await getRedis();
  if (r) {
    try { return (await r.get(`blocklist:${token}`)) === "1"; } catch {}
  }
  const expiry = blocklist.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) { blocklist.delete(token); return false; }
  return true;
}
