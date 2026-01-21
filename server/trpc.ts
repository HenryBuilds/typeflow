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
    // Check if organization exists
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, input.organizationId),
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    // Check if user is a member of the organization
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, ctx.userId!)
      ),
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organization",
      });
    }

    return next({
      ctx: {
        ...ctx,
        organization,
        membership,
      },
    });
  });
