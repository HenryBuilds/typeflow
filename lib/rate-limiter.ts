import { getRedisConnection } from "@/lib/queue/connection";
import { createLogger } from "@/lib/logger";

const log = createLogger("RateLimiter");

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in seconds
}

export interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional prefix for Redis keys */
  keyPrefix?: string;
}

/**
 * A sliding-window rate limiter backed by Redis.
 * Uses Redis INCR with EXPIRE for efficient, atomic rate limiting.
 */
export class RateLimiter {
  private limit: number;
  private windowSeconds: number;
  private keyPrefix: string;

  constructor(options: RateLimiterOptions) {
    this.limit = options.limit;
    this.windowSeconds = options.windowSeconds;
    this.keyPrefix = options.keyPrefix || "ratelimit";
  }

  /**
   * Check if a request should be allowed for the given key.
   * @param identifier - Unique identifier for rate limiting (e.g., "webhook:orgId:path" or IP address)
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % this.windowSeconds);
    const key = `${this.keyPrefix}:${identifier}:${windowStart}`;
    const resetTime = windowStart + this.windowSeconds;

    try {
      const redis = getRedisConnection();

      // Use a transaction to atomically increment and set expiry
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, this.windowSeconds + 1); // Add 1 second buffer
      const results = await pipeline.exec();

      if (!results || results.length === 0) {
        // Redis error, fail open
        log.warn({ key }, "Rate limiter pipeline returned no results, allowing request");
        return this.createAllowedResult(resetTime);
      }

      const [incrResult] = results;
      if (incrResult[0]) {
        // Error during INCR
        log.error({ err: incrResult[0], key }, "Rate limiter INCR error, allowing request");
        return this.createAllowedResult(resetTime);
      }

      const currentCount = incrResult[1] as number;
      const remaining = Math.max(0, this.limit - currentCount);
      const allowed = currentCount <= this.limit;

      if (!allowed) {
        log.info({ key, currentCount, limit: this.limit }, "Rate limit exceeded");
      }

      return {
        allowed,
        limit: this.limit,
        remaining,
        resetTime,
      };
    } catch (error) {
      // Fail open on Redis errors to prevent blocking legitimate requests
      log.error({ err: error, key }, "Rate limiter error, allowing request (fail-open)");
      return this.createAllowedResult(resetTime);
    }
  }

  private createAllowedResult(resetTime: number, limit?: number): RateLimitResult {
    const effectiveLimit = limit ?? this.limit;
    return {
      allowed: true,
      limit: effectiveLimit,
      remaining: effectiveLimit,
      resetTime,
    };
  }

  /**
   * Check rate limit with a custom limit value (useful for per-resource configuration).
   * @param identifier - Unique identifier for rate limiting
   * @param customLimit - Override the default limit (0 = unlimited)
   */
  async checkWithLimit(identifier: string, customLimit: number): Promise<RateLimitResult> {
    // If customLimit is 0, rate limiting is disabled
    if (customLimit === 0) {
      return {
        allowed: true,
        limit: 0,
        remaining: Number.MAX_SAFE_INTEGER,
        resetTime: 0,
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % this.windowSeconds);
    const key = `${this.keyPrefix}:${identifier}:${windowStart}`;
    const resetTime = windowStart + this.windowSeconds;

    try {
      const redis = getRedisConnection();

      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, this.windowSeconds + 1);
      const results = await pipeline.exec();

      if (!results || results.length === 0) {
        log.warn({ key }, "Rate limiter pipeline returned no results, allowing request");
        return this.createAllowedResult(resetTime, customLimit);
      }

      const [incrResult] = results;
      if (incrResult[0]) {
        log.error({ err: incrResult[0], key }, "Rate limiter INCR error, allowing request");
        return this.createAllowedResult(resetTime, customLimit);
      }

      const currentCount = incrResult[1] as number;
      const remaining = Math.max(0, customLimit - currentCount);
      const allowed = currentCount <= customLimit;

      if (!allowed) {
        log.info({ key, currentCount, limit: customLimit }, "Rate limit exceeded");
      }

      return {
        allowed,
        limit: customLimit,
        remaining,
        resetTime,
      };
    } catch (error) {
      log.error({ err: error, key }, "Rate limiter error, allowing request (fail-open)");
      return this.createAllowedResult(resetTime, customLimit);
    }
  }
}

/**
 * Generate standard rate limit headers for HTTP responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetTime),
    "Retry-After": result.allowed ? "" : String(result.resetTime - Math.floor(Date.now() / 1000)),
  };
}

/**
 * Pre-configured rate limiter for webhook endpoints.
 * Allows 100 requests per minute per webhook.
 */
export const webhookRateLimiter = new RateLimiter({
  limit: 100,
  windowSeconds: 60,
  keyPrefix: "rl:webhook",
});

/**
 * Pre-configured rate limiter for API endpoints.
 * Allows 500 requests per minute per IP.
 */
export const apiRateLimiter = new RateLimiter({
  limit: 500,
  windowSeconds: 60,
  keyPrefix: "rl:api",
});
