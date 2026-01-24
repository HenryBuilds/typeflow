import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { packages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { packageManager } from "../services/package-manager";

export const packagesRouter = router({
  // List all packages in organization
  list: organizationProcedure
    .query(async ({ ctx }) => {
      return await db.query.packages.findMany({
        where: eq(packages.organizationId, ctx.organization.id),
        orderBy: (pkg, { desc }) => [desc(pkg.installedAt)],
      });
    }),

  // Search packages on npm
  search: organizationProcedure
    .input(z.object({ 
      organizationId: z.string(),
      query: z.string().min(1),
      limit: z.number().optional().default(20),
    }))
    .query(async ({ input }) => {
      return await packageManager.searchPackages(input.query, input.limit);
    }),

  // Get package info from npm
  getInfo: organizationProcedure
    .input(z.object({ 
      organizationId: z.string(),
      name: z.string() 
    }))
    .query(async ({ input }) => {
      return await packageManager.getPackageInfo(input.name);
    }),

  // Get package by name
  getByName: organizationProcedure
    .input(z.object({ 
      organizationId: z.string(),
      name: z.string() 
    }))
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

  // Install package (actual npm install)
  install: organizationProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        version: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await packageManager.installPackage(
        ctx.organization.id,
        input.name,
        input.version
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to install package");
      }

      // Return the installed package from DB
      const installed = await db.query.packages.findFirst({
        where: and(
          eq(packages.organizationId, ctx.organization.id),
          eq(packages.name, input.name)
        ),
      });

      return installed;
    }),

  // Uninstall package (actual npm uninstall)
  uninstall: organizationProcedure
    .input(z.object({ 
      organizationId: z.string(),
      name: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await packageManager.uninstallPackage(
        ctx.organization.id,
        input.name
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to uninstall package");
      }

      return { success: true };
    }),

  // Delete package completely
  delete: organizationProcedure
    .input(z.object({ 
      organizationId: z.string(),
      name: z.string() 
    }))
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

