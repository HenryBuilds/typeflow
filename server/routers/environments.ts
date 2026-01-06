import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { environments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const environmentsRouter = router({
  // List all environment variables
  list: organizationProcedure.query(async ({ ctx }) => {
    return await db.query.environments.findMany({
      where: eq(environments.organizationId, ctx.organization.id),
      orderBy: (envs, { asc }) => [asc(envs.key)],
    });
  }),

  // Get environment variable by key
  getByKey: organizationProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const env = await db.query.environments.findFirst({
        where: and(
          eq(environments.organizationId, ctx.organization.id),
          eq(environments.key, input.key)
        ),
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if exists
      const existing = await db.query.environments.findFirst({
        where: and(
          eq(environments.organizationId, ctx.organization.id),
          eq(environments.key, input.key)
        ),
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
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(environments)
        .where(
          and(
            eq(environments.organizationId, ctx.organization.id),
            eq(environments.key, input.key)
          )
        );

      return { success: true };
    }),
});

