/**
 * tRPC HTTP Response Handler for App Router
 * @see https://trpc.io/docs/v11/adapters/fetch
 */
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/index";
import { createContext } from "@/server/context";
import { cookies } from "next/headers";

// Cookie configuration
const COOKIE_NAME = "token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Set auth cookie on successful login
 */
function setAuthCookie(response: Response, token: string): Response {
  const headers = new Headers(response.headers);
  const isProduction = process.env.NODE_ENV === "production";
  
  headers.set("Set-Cookie", [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE}`,
    "SameSite=Lax",
    "HttpOnly",
    ...(isProduction ? ["Secure"] : []),
  ].join("; "));
  
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Clear auth cookie on logout
 */
function clearAuthCookie(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Extract token from TRPC response data
 */
function extractToken(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) return extractToken(data[0]);
  
  const obj = data as Record<string, unknown>;
  const token = (obj.result as Record<string, unknown>)?.data as Record<string, unknown>;
  return typeof token?.token === "string" ? token.token : null;
}

/**
 * Main handler
 */
const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const procedurePath = url.pathname.split("/api/trpc/")[1] ?? "";

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    /**
     * @see https://trpc.io/docs/v11/error-handling
     */
    onError({ error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("tRPC Internal Error:", error);
      }
    },
  });

  // Handle auth cookie management
  if (procedurePath === "auth.logout") {
    return clearAuthCookie(response);
  }

  if (procedurePath === "auth.login") {
    try {
      const data = await response.clone().json();
      const token = extractToken(data);
      if (token) return setAuthCookie(response, token);
    } catch {
      // Ignore parse errors
    }
  }

  return response;
};

export { handler as GET, handler as POST };
