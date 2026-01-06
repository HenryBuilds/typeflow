import { publicProcedure, router } from "./trpc";
import { z } from "zod";

export const appRouter = router({
  userList: publicProcedure.input(z.string()).query(async (ctx) => {
    return ctx.input;
  }),
});
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
