/**
 * Next.js Instrumentation
 * This file is loaded at server startup before any other code.
 * Used to validate environment variables early.
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import env module to trigger validation
    // This will call process.exit(1) if required vars are missing
    await import("./lib/env");
  }
}
