import { db } from "@/db/db";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export interface Context {
  db: typeof db;
  userId: string | null;
}

export async function createContext(): Promise<Context> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  
  let userId: string | null = null;
  
  if (token) {
    const payload = verifyToken(token);
    userId = payload?.userId ?? null;
  }

  return { db, userId };
}
