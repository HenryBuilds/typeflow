import { z } from "zod";
import { router, protectedProcedure, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { organizations, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const organizationsRouter = router({
  // Get all organizations for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Filter by user membership
    return await db.query.organizations.findMany({
      orderBy: (orgs, { desc }) => [desc(orgs.createdAt)],
    });
  }),

  // Get single organization by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, input.id),
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      return org;
    }),

  // Get organization by slug
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      return org;
    }),

  // Create new organization
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [org] = await db
        .insert(organizations)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description,
        })
        .returning();

      // TODO: Add creator as owner member
      // await db.insert(organizationMembers).values({
      //   organizationId: org.id,
      //   userId: ctx.userId!,
      //   role: "owner",
      // });

      return org;
    }),

  // Update organization
  update: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(organizations)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, ctx.organization.id))
        .returning();

      return updated;
    }),

  // Delete organization
  delete: organizationProcedure.mutation(async ({ ctx }) => {
    await db
      .delete(organizations)
      .where(eq(organizations.id, ctx.organization.id));

    return { success: true };
  }),

  // Get organization members
  getMembers: organizationProcedure.query(async ({ ctx }) => {
    return await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, ctx.organization.id),
      with: {
        user: true,
      },
    });
  }),
});
