import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { packages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const packagesRouter = router({
  // List all packages in organization
  list: organizationProcedure.query(async ({ ctx }) => {
    return await db.query.packages.findMany({
      where: eq(packages.organizationId, ctx.organization.id),
      orderBy: (pkg, { desc }) => [desc(pkg.installedAt)],
    });
  }),

  // Get package by name
  getByName: organizationProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const pkg = await db.query.packages.findFirst({
        where: and(
          eq(packages.organizationId, ctx.organization.id),
          eq(packages.name, input.name)
        ),
      });

      if (!pkg) {
        throw new Error("Package not found");
      }

      return pkg;
    }),

  // Install package
  install: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1),
        version: z.string().min(1),
        packageJson: z.record(z.unknown()),
        typeDefinitions: z.string().optional(),
        dependencies: z.record(z.string()).optional(),
        devDependencies: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if package already exists
      const existing = await db.query.packages.findFirst({
        where: and(
          eq(packages.organizationId, ctx.organization.id),
          eq(packages.name, input.name)
        ),
      });

      if (existing) {
        // Update existing package
        const [updated] = await db
          .update(packages)
          .set({
            version: input.version,
            packageJson: input.packageJson,
            typeDefinitions: input.typeDefinitions,
            dependencies: input.dependencies,
            devDependencies: input.devDependencies,
            installedAt: new Date(),
            isActive: true,
          })
          .where(eq(packages.id, existing.id))
          .returning();

        return updated;
      }

      // Create new package
      const [created] = await db
        .insert(packages)
        .values({
          organizationId: ctx.organization.id,
          name: input.name,
          version: input.version,
          packageJson: input.packageJson,
          typeDefinitions: input.typeDefinitions,
          dependencies: input.dependencies,
          devDependencies: input.devDependencies,
        })
        .returning();

      return created;
    }),

  // Uninstall package (set inactive)
  uninstall: organizationProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(packages)
        .set({ isActive: false })
        .where(
          and(
            eq(packages.organizationId, ctx.organization.id),
            eq(packages.name, input.name)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Package not found");
      }

      return updated;
    }),

  // Delete package completely
  delete: organizationProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(packages)
        .where(
          and(
            eq(packages.organizationId, ctx.organization.id),
            eq(packages.name, input.name)
          )
        );

      return { success: true };
    }),
});

