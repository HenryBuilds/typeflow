import { z } from "zod";

// Only load dotenv on server-side
if (typeof window === "undefined") {
  require("dotenv/config");
}

/**
 * Environment variable schema with validation
 * Required variables will cause the app to fail fast if not set
 */
const envSchema = z.object({
  // Database - REQUIRED
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required. Example: postgresql://user:pass@host:5432/db"),

  // Security - REQUIRED in production
  JWT_SECRET: z
    .string()
    .min(1, "JWT_SECRET is required for secure authentication"),
  
  ENCRYPTION_KEY: z
    .string()
    .min(1, "ENCRYPTION_KEY is required for credential encryption"),

  // Redis - Optional with default
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Server configuration
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  // Feature flags
  ENABLE_WORKER_QUEUE: z.string().default("false"),
  NEXT_PUBLIC_DEMO_MODE: z.string().optional(),

  // Vercel (optional, for deployment)
  VERCEL_URL: z.string().optional(),
  
  // Worker configuration
  WORKER_CONCURRENCY: z.coerce.number().default(5),
});

// Client-side safe schema (only public env vars)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_DEMO_MODE: z.string().optional(),
});

type ServerEnv = z.infer<typeof envSchema>;
type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validated server environment variables
 * Will throw and prevent app startup if required vars are missing
 * 
 * Note: We use console.error here instead of the pino logger because
 * the logger itself depends on env vars and may not be initialized yet.
 */
function validateServerEnv(): ServerEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("\n[env] FATAL: Missing or invalid environment variables\n");
    
    const errors = result.error.flatten().fieldErrors;
    for (const [key, messages] of Object.entries(errors)) {
      console.error(`  ${key}:`);
      messages?.forEach((msg) => console.error(`    - ${msg}`));
    }

    console.error("\nCreate a .env file with the required variables.");
    console.error("See .env.example for reference.\n");
    
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated client environment variables (safe for browser)
 */
function validateClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  });
}

// Only validate server env on server-side
export const env: ServerEnv = typeof window === "undefined" 
  ? validateServerEnv() 
  : ({} as ServerEnv);

export const clientEnv: ClientEnv = validateClientEnv();

// Type exports for use elsewhere
export type { ServerEnv, ClientEnv };
