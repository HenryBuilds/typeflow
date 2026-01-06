import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { db } from "@/db/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
