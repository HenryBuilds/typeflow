import { db } from "@/db/db";
import { verifyToken } from "@/lib/jwt";
import { cookies, headers } from "next/headers";

export interface Context {
  db: typeof db;
  userId: string | null;
  clientIp: string;
}

export async function createContext(): Promise<Context> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = cookieStore.get("token")?.value;
  
  let userId: string | null = null;
  
  if (token) {
    const payload = verifyToken(token);
    userId = payload?.userId ?? null;
  }

  // Extract client IP for rate limiting
  const clientIp = headerStore.get("x-forwarded-for")?.split(",")[0].trim() ||
                   headerStore.get("x-real-ip") ||
                   "unknown";

  return { db, userId, clientIp };
}
