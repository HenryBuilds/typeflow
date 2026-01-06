import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { webhooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const webhooksRouter = router({
  // List all webhooks in organization
  list: organizationProcedure.query(async ({ ctx }) => {
    return await db.query.webhooks.findMany({
      where: eq(webhooks.organizationId, ctx.organization.id),
      orderBy: (wh, { desc }) => [desc(wh.createdAt)],
    });
  }),

  // Get webhook by ID
  getById: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const webhook = await db.query.webhooks.findFirst({
        where: and(
          eq(webhooks.id, input.id),
          eq(webhooks.organizationId, ctx.organization.id)
        ),
        with: {
          workflow: true,
        },
      });

      if (!webhook) {
        throw new Error("Webhook not found");
      }

      return webhook;
    }),

  // Get webhook by path
  getByPath: organizationProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ ctx, input }) => {
      const webhook = await db.query.webhooks.findFirst({
        where: and(
          eq(webhooks.organizationId, ctx.organization.id),
          eq(webhooks.path, input.path)
        ),
        with: {
          workflow: true,
        },
      });

      if (!webhook) {
        throw new Error("Webhook not found");
      }

      return webhook;
    }),

  // Create webhook
  create: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        path: z.string().min(1),
        method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("POST"),
        authType: z.enum(["none", "api_key", "bearer", "basic"]).optional(),
        authConfig: z.record(z.unknown()).optional(),
        requestSchema: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [webhook] = await db
        .insert(webhooks)
        .values({
          organizationId: ctx.organization.id,
          workflowId: input.workflowId,
          path: input.path,
          method: input.method,
          authType: input.authType,
          authConfig: input.authConfig,
          requestSchema: input.requestSchema,
        })
        .returning();

      return webhook;
    }),

  // Update webhook
  update: organizationProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        path: z.string().min(1).optional(),
        method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
        isActive: z.boolean().optional(),
        authType: z.enum(["none", "api_key", "bearer", "basic"]).optional(),
        authConfig: z.record(z.unknown()).optional(),
        requestSchema: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updated] = await db
        .update(webhooks)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(webhooks.id, id),
            eq(webhooks.organizationId, ctx.organization.id)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Webhook not found");
      }

      return updated;
    }),

  // Delete webhook
  delete: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(webhooks)
        .where(
          and(
            eq(webhooks.id, input.id),
            eq(webhooks.organizationId, ctx.organization.id)
          )
        );

      return { success: true };
    }),
});

