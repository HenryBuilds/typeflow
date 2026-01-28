import { Redis } from "ioredis";

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (redisConnection) {
    return redisConnection;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redisConnection.on("error", (error) => {
    console.error("Redis connection error:", error);
  });

  redisConnection.on("connect", () => {
    console.log("[REDIS] Connected successfully");
  });

  return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
