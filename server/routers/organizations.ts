import { z } from "zod";
import { router, protectedProcedure, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { organizations, organizationMembers, organizationInvites } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const organizationsRouter = router({
  // Get all organizations for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.userId, ctx.userId!),
      with: {
        organization: true,
      },
      orderBy: (members, { desc }) => [desc(members.joinedAt)],
    });

    return memberships.map((m) => m.organization);
  }),

  // Get single organization by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const membership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, input.id),
          eq(organizationMembers.userId, ctx.userId!)
        ),
        with: {
          organization: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or you are not a member",
        });
      }

      return membership.organization;
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

  // Check slug availability and suggest alternative
  checkSlugAvailability: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.slug || input.slug.length === 0) {
        return {
          available: false,
          suggestedSlug: null,
        };
      }

      const existing = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      if (!existing) {
        return {
          available: true,
          suggestedSlug: null,
        };
      }

      let counter = 1;
      let suggestedSlug = `${input.slug}-${counter}`;
      let isAvailable = false;

      while (!isAvailable && counter < 100) {
        const check = await db.query.organizations.findFirst({
          where: eq(organizations.slug, suggestedSlug),
        });

        if (!check) {
          isAvailable = true;
        } else {
          counter++;
          suggestedSlug = `${input.slug}-${counter}`;
        }
      }

      return {
        available: false,
        suggestedSlug: isAvailable ? suggestedSlug : null,
      };
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
      const existing = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      if (existing) {
        let counter = 1;
        let suggestedSlug = `${input.slug}-${counter}`;
        let isAvailable = false;

        while (!isAvailable && counter < 100) {
          const check = await db.query.organizations.findFirst({
            where: eq(organizations.slug, suggestedSlug),
          });

          if (!check) {
            isAvailable = true;
          } else {
            counter++;
            suggestedSlug = `${input.slug}-${counter}`;
          }
        }

        throw new TRPCError({
          code: "CONFLICT",
          message: `Slug "${input.slug}" is already taken. ${
            isAvailable
              ? `Suggested: "${suggestedSlug}"`
              : "Please choose a different slug."
          }`,
        });
      }

      const [org] = await db
        .insert(organizations)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description,
        })
        .returning();

      await db.insert(organizationMembers).values({
        organizationId: org.id,
        userId: ctx.userId!,
        role: "owner",
      });

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

  // Remove member from organization
  removeMember: organizationProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only owner/admin can remove members
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can remove members",
        });
      }

      // Get the member to remove
      const memberToRemove = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.id, input.memberId),
          eq(organizationMembers.organizationId, ctx.organization.id)
        ),
      });

      if (!memberToRemove) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Prevent removing the last owner
      if (memberToRemove.role === "owner") {
        const ownerCount = await db.query.organizationMembers.findMany({
          where: and(
            eq(organizationMembers.organizationId, ctx.organization.id),
            eq(organizationMembers.role, "owner")
          ),
        });

        if (ownerCount.length <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last owner of the organization",
          });
        }
      }

      await db
        .delete(organizationMembers)
        .where(eq(organizationMembers.id, input.memberId));

      return { success: true };
    }),

  // Create invite link
  createInviteLink: organizationProcedure
    .input(
      z.object({
        role: z.enum(["admin", "member", "viewer"]).default("member"),
        expiresInDays: z.number().optional(),
        maxUses: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only owner/admin can create invites
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can create invite links",
        });
      }

      const code = generateInviteCode();
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const [invite] = await db
        .insert(organizationInvites)
        .values({
          organizationId: ctx.organization.id,
          code,
          role: input.role,
          createdBy: ctx.userId!,
          expiresAt,
          maxUses: input.maxUses ?? null,
        })
        .returning();

      return invite;
    }),

  // Get all invite links for organization
  getInviteLinks: organizationProcedure.query(async ({ ctx }) => {
    return await db.query.organizationInvites.findMany({
      where: eq(organizationInvites.organizationId, ctx.organization.id),
      with: {
        creator: true,
      },
      orderBy: (invites, { desc }) => [desc(invites.createdAt)],
    });
  }),

  // Delete invite link
  deleteInviteLink: organizationProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete invite links",
        });
      }

      await db
        .delete(organizationInvites)
        .where(
          and(
            eq(organizationInvites.id, input.inviteId),
            eq(organizationInvites.organizationId, ctx.organization.id)
          )
        );

      return { success: true };
    }),

  // Get invite info (public - no auth required)
  getInviteInfo: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const invite = await db.query.organizationInvites.findFirst({
        where: eq(organizationInvites.code, input.code),
        with: {
          organization: true,
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found or expired",
        });
      }

      // Check expiration
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite link has expired",
        });
      }

      // Check max uses
      if (invite.maxUses && invite.usedCount >= invite.maxUses) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite link has reached its maximum uses",
        });
      }

      return {
        organizationName: invite.organization.name,
        organizationSlug: invite.organization.slug,
        role: invite.role,
      };
    }),

  // Accept invite
  acceptInvite: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await db.query.organizationInvites.findFirst({
        where: eq(organizationInvites.code, input.code),
        with: {
          organization: true,
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      // Check expiration
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite link has expired",
        });
      }

      // Check max uses
      if (invite.maxUses && invite.usedCount >= invite.maxUses) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite link has reached its maximum uses",
        });
      }

      // Check if already a member
      const existingMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, invite.organizationId),
          eq(organizationMembers.userId, ctx.userId!)
        ),
      });

      if (existingMember) {
        return {
          success: true,
          alreadyMember: true,
          organizationId: invite.organizationId,
        };
      }

      // Add user to organization
      await db.insert(organizationMembers).values({
        organizationId: invite.organizationId,
        userId: ctx.userId!,
        role: invite.role,
      });

      // Increment used count
      await db
        .update(organizationInvites)
        .set({ usedCount: invite.usedCount + 1 })
        .where(eq(organizationInvites.id, invite.id));

      return {
        success: true,
        alreadyMember: false,
        organizationId: invite.organizationId,
      };
    }),
});

// Helper function to generate invite codes
function generateInviteCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

