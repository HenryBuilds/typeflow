import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/index";
import { db } from "@/db/db";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

function extractProcedurePath(pathname: string): string {
  const match = pathname.match(/\/api\/trpc\/(.+)$/);
  return match ? match[1] : "";
}

function extractTokenFromResponse(data: unknown): string | null {
  if (data && typeof data === "object") {
    if ("result" in data && data.result && typeof data.result === "object") {
      if ("data" in data.result && data.result.data && typeof data.result.data === "object") {
        if ("token" in data.result.data && typeof data.result.data.token === "string") {
          return data.result.data.token;
        }
      }
    }
    if (Array.isArray(data) && data.length > 0) {
      return extractTokenFromResponse(data[0]);
    }
  }
  return null;
}

function setAuthCookie(response: Response, token: string): Response {
  const headers = new Headers(response.headers);
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = [
    `token=${token}`,
    "Path=/",
    `Max-Age=${7 * 24 * 60 * 60}`,
    "SameSite=Lax",
    "HttpOnly",
    ...(isProduction ? ["Secure"] : []),
  ].join("; ");

  headers.set("Set-Cookie", cookieOptions);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function clearAuthCookie(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Set-Cookie", "token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

const handler = async (req: Request) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let userId: string | null = null;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      userId = payload.userId;
    }
  }

  const url = new URL(req.url);
  const procedurePath = extractProcedurePath(url.pathname);

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      return {
        db,
        userId,
      };
    },
    onError: ({ error, path }) => {
      console.error(`tRPC Error on '${path}':`, error);
    },
  });

  if (procedurePath === "auth.logout") {
    return clearAuthCookie(response);
  }

  const clonedResponse = response.clone();
  let responseData: unknown;

  try {
    responseData = await clonedResponse.json();
  } catch {
    return response;
  }

  const tokenValue = extractTokenFromResponse(responseData);

  if (tokenValue && procedurePath === "auth.login") {
    return setAuthCookie(response, tokenValue);
  }

  return response;
};

export { handler as GET, handler as POST };
