import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimiter, getRateLimitHeaders } from "../rate-limiter";

// Mock the Redis connection
vi.mock("@/lib/queue/connection", () => {
  const mockPipeline = {
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  };

  return {
    getRedisConnection: vi.fn(() => ({
      pipeline: vi.fn(() => mockPipeline),
    })),
    __mockPipeline: mockPipeline,
  };
});

// Access the mocked pipeline
import { getRedisConnection } from "@/lib/queue/connection";
const mockRedis = getRedisConnection();
const mockPipeline = (mockRedis as any).pipeline();

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow requests under the limit", async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 1]]);

    const limiter = new RateLimiter({ limit: 10, windowSeconds: 60 });
    const result = await limiter.check("test-key");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.limit).toBe(10);
  });

  it("should block requests over the limit", async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 11]]);

    const limiter = new RateLimiter({ limit: 10, windowSeconds: 60 });
    const result = await limiter.check("test-key");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should allow the request at exactly the limit", async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 10]]);

    const limiter = new RateLimiter({ limit: 10, windowSeconds: 60 });
    const result = await limiter.check("test-key");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should fail open on Redis error", async () => {
    mockPipeline.exec.mockRejectedValueOnce(new Error("Redis connection failed"));

    const limiter = new RateLimiter({ limit: 10, windowSeconds: 60 });
    const result = await limiter.check("test-key");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it("should fail open when pipeline returns no results", async () => {
    mockPipeline.exec.mockResolvedValueOnce(null);

    const limiter = new RateLimiter({ limit: 10, windowSeconds: 60 });
    const result = await limiter.check("test-key");

    expect(result.allowed).toBe(true);
  });
});

describe("getRateLimitHeaders", () => {
  it("should return correct headers for an allowed request", () => {
    const headers = getRateLimitHeaders({
      allowed: true,
      limit: 100,
      remaining: 50,
      resetTime: 1700000000,
    });

    expect(headers["X-RateLimit-Limit"]).toBe("100");
    expect(headers["X-RateLimit-Remaining"]).toBe("50");
    expect(headers["X-RateLimit-Reset"]).toBe("1700000000");
    expect(headers["Retry-After"]).toBe("");
  });

  it("should return Retry-After for a blocked request", () => {
    const now = Math.floor(Date.now() / 1000);
    const resetTime = now + 30;

    const headers = getRateLimitHeaders({
      allowed: false,
      limit: 100,
      remaining: 0,
      resetTime,
    });

    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(parseInt(headers["Retry-After"])).toBeGreaterThan(0);
    expect(parseInt(headers["Retry-After"])).toBeLessThanOrEqual(30);
  });
});
