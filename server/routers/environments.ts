import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { environments } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const environmentsRouter = router({
  // List all environment variables
  list: organizationProcedure
    .input(z.object({ workflowId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const filters = [eq(environments.organizationId, ctx.organization.id)];
      
      if (input.workflowId) {
        filters.push(eq(environments.workflowId, input.workflowId));
      } else {
        filters.push(isNull(environments.workflowId));
      }

      return await db.query.environments.findMany({
        where: and(...filters),
        orderBy: (envs, { asc }) => [asc(envs.key)],
      });
    }),

  // Get environment variable by key
  getByKey: organizationProcedure
    .input(z.object({ key: z.string(), workflowId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const filters = [
        eq(environments.organizationId, ctx.organization.id),
        eq(environments.key, input.key),
      ];

      if (input.workflowId) {
        filters.push(eq(environments.workflowId, input.workflowId));
      } else {
        filters.push(isNull(environments.workflowId));
      }

      const env = await db.query.environments.findFirst({
        where: and(...filters),
      });

      if (!env) {
        throw new Error("Environment variable not found");
      }

      return env;
    }),

  // Create or update environment variable
  set: organizationProcedure
    .input(
      z.object({
        key: z.string().min(1),
        value: z.string(),
        isSecret: z.boolean().default(false),
        description: z.string().optional(),
        workflowId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const filters = [
        eq(environments.organizationId, ctx.organization.id),
        eq(environments.key, input.key),
      ];

      if (input.workflowId) {
        filters.push(eq(environments.workflowId, input.workflowId));
      } else {
        filters.push(isNull(environments.workflowId));
      }

      // Check if exists
      const existing = await db.query.environments.findFirst({
        where: and(...filters),
      });

      if (existing) {
        const [updated] = await db
          .update(environments)
          .set({
            value: input.value,
            isSecret: input.isSecret,
            description: input.description,
            updatedAt: new Date(),
          })
          .where(eq(environments.id, existing.id))
          .returning();

        return updated;
      }

      const [created] = await db
        .insert(environments)
        .values({
          organizationId: ctx.organization.id,
          workflowId: input.workflowId,
          key: input.key,
          value: input.value,
          isSecret: input.isSecret,
          description: input.description,
        })
        .returning();

      return created;
    }),

  // Delete environment variable
  delete: organizationProcedure
    .input(z.object({ key: z.string(), workflowId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const filters = [
        eq(environments.organizationId, ctx.organization.id),
        eq(environments.key, input.key),
      ];

      if (input.workflowId) {
        filters.push(eq(environments.workflowId, input.workflowId));
      } else {
        filters.push(isNull(environments.workflowId));
      }

      await db
        .delete(environments)
        .where(and(...filters));

      return { success: true };
    }),
});

