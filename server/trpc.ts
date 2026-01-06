import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { db } from "@/db/db";
import { organizations, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

import { z } from "zod";

export const organizationProcedure = protectedProcedure
  .input(
    z.object({
      organizationId: z.string().uuid(),
    })
  )
  .use(async ({ ctx, input, next }) => {
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, input.organizationId),
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return next({
      ctx: {
        ...ctx,
        organization,
      },
    });
  });
