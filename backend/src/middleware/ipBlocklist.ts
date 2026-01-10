/**
 * IP blocklist middleware — Redis-backed (in-memory fallback) set of blocked
 * IPs that receive a 403 before any route handler runs. Entries may be
 * permanent or TTL-scoped (e.g. auto-expire after a brute-force window).
 *
 * Every request is checked independently; the decision is never cached.
 */

import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import { logger } from "../utils/logger";

// Module-level Redis reference — shared with the main redis utility
// to avoid opening a second connection.
let _redis: Redis | null = null;

export function setRedisClient(client: Redis): void {
  _redis = client;
}

const BLOCKLIST_PREFIX = "ip-block:";

// In-memory fallback when Redis is unavailable
const memoryBlocklist = new Map<string, number | null>(); // value: expiry ms | null = permanent

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  return (forwarded ? forwarded.split(",")[0].trim() : null) || req.ip || req.socket?.remoteAddress || "unknown";
}

async function redisIsBlocked(ip: string): Promise<boolean> {
  if (!_redis) return false;
  try {
    const key = `${BLOCKLIST_PREFIX}${ip}`;
    const value = await _redis.get(key);
    return value !== null;
  } catch {
    return false;
  }
}

async function memoryIsBlocked(ip: string): Promise<boolean> {
  const expiry = memoryBlocklist.get(ip);
  if (expiry === undefined) return false;
  if (expiry === null) return true;
  if (Date.now() > expiry) {
    memoryBlocklist.delete(ip);
    return false;
  }
  return true;
}

// Public helpers — used by the admin service

/**
 * Block an IP, optionally with a TTL in seconds (omit for a permanent block).
 */
export async function blockIp(ip: string, ttlSeconds?: number): Promise<void> {
  if (_redis) {
    try {
      const key = `${BLOCKLIST_PREFIX}${ip}`;
      if (ttlSeconds) {
        await _redis.setex(key, ttlSeconds, "1");
      } else {
        await _redis.set(key, "1");
      }
      logger.warn("IP blocked", { ip, ttlSeconds });
      return;
    } catch {}
  }
  memoryBlocklist.set(ip, ttlSeconds ? Date.now() + ttlSeconds * 1000 : null);
  logger.warn("IP blocked (memory fallback)", { ip, ttlSeconds });
}

export async function unblockIp(ip: string): Promise<void> {
  if (_redis) {
    try {
      await _redis.del(`${BLOCKLIST_PREFIX}${ip}`);
    } catch {}
  }
  memoryBlocklist.delete(ip);
  logger.info("IP unblocked", { ip });
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  if (await redisIsBlocked(ip)) return true;
  return memoryIsBlocked(ip);
}

export async function ipBlocklistMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip = getClientIp(req);

  if (await isIpBlocked(ip)) {
    logger.warn("Blocked IP attempted access", { ip, path: req.path });
    res.status(403).json({
      status: "error",
      message: "Access denied",
    });
    return;
  }

  next();
}
