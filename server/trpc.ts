import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { db } from "@/db/db";
import { organizations, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiRateLimiter } from "@/lib/rate-limiter";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Rate limiting middleware for API routes
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const rateLimitResult = await apiRateLimiter.check(ctx.clientIp);
  
  if (!rateLimitResult.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${rateLimitResult.resetTime - Math.floor(Date.now() / 1000)} seconds.`,
    });
  }

  return next({ ctx });
});

export const protectedProcedure = t.procedure
  .use(rateLimitMiddleware)
  .use(async ({ ctx, next }) => {
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
