import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/index";
import { db } from "@/db/db";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({
      db,
      // TODO: Add authentication/session here
      userId: null as string | null,
    }),
  });

export { handler as GET, handler as POST };
