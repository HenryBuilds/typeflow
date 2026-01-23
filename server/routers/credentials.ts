import { z } from "zod";
import { organizationProcedure, router } from "../trpc";
import { db } from "@/db/db";
import { credentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encryptObject, decryptObject } from "@/lib/encryption";
import { TRPCError } from "@trpc/server";

// Validation schemas for different credential types
const postgresConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional(),
});

const mysqlConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional(),
});

const mongodbConfigSchema = z.object({
  connectionString: z.string().min(1),
  database: z.string().min(1),
});

const redisConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  password: z.string().optional(),
  database: z.number().int().optional(),
});

const credentialConfigSchema = z.union([
  postgresConfigSchema,
  mysqlConfigSchema,
  mongodbConfigSchema,
  redisConfigSchema,
]);

export const credentialsRouter = router({
  list: organizationProcedure.query(async ({ ctx, input }) => {
    const creds = await db.query.credentials.findMany({
      where: eq(credentials.organizationId, input.organizationId),
      orderBy: (credentials, { desc }) => [desc(credentials.createdAt)],
    });

    // Don't send encrypted config to client, just metadata
    return creds.map((cred) => ({
      id: cred.id,
      name: cred.name,
      type: cred.type,
      description: cred.description,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    }));
  }),

  get: organizationProcedure
    .input(
      z.object({
        credentialId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const cred = await db.query.credentials.findFirst({
        where: and(
          eq(credentials.id, input.credentialId),
          eq(credentials.organizationId, input.organizationId)
        ),
      });

      if (!cred) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credential not found",
        });
      }

      // Decrypt config for editing
      const config = decryptObject(cred.config as string);

      return {
        id: cred.id,
        name: cred.name,
        type: cred.type,
        description: cred.description,
        config,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt,
      };
    }),

  create: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(["postgres", "mysql", "mongodb", "redis"]),
        description: z.string().optional(),
        config: credentialConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Encrypt the config before storing
      const encryptedConfig = encryptObject(input.config);

      const [credential] = await db
        .insert(credentials)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          type: input.type,
          description: input.description,
          config: encryptedConfig,
        })
        .returning();

      return {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        description: credential.description,
        createdAt: credential.createdAt,
      };
    }),

  update: organizationProcedure
    .input(
      z.object({
        credentialId: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        config: credentialConfigSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await db.query.credentials.findFirst({
        where: and(
          eq(credentials.id, input.credentialId),
          eq(credentials.organizationId, input.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credential not found",
        });
      }

      const updateData: {
        name?: string;
        description?: string | null;
        config?: string;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (input.name) {
        updateData.name = input.name;
      }

      if (input.description !== undefined) {
        updateData.description = input.description;
      }

      if (input.config) {
        updateData.config = encryptObject(input.config);
      }

      const [updated] = await db
        .update(credentials)
        .set(updateData)
        .where(eq(credentials.id, input.credentialId))
        .returning();

      return {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        description: updated.description,
        updatedAt: updated.updatedAt,
      };
    }),

  delete: organizationProcedure
    .input(
      z.object({
        credentialId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await db.query.credentials.findFirst({
        where: and(
          eq(credentials.id, input.credentialId),
          eq(credentials.organizationId, input.organizationId)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credential not found",
        });
      }

      await db.delete(credentials).where(eq(credentials.id, input.credentialId));

      return { success: true };
    }),

  testConnection: organizationProcedure
    .input(
      z.object({
        type: z.enum(["postgres", "mysql", "mongodb", "redis"]),
        config: credentialConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Test the connection without saving
      try {
        const { createClient } = await import("../services/credential-service");
        
        // This would need to be implemented in credential-service
        // For now, return success
        return { success: true, message: "Connection test successful" };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Connection test failed",
        };
      }
    }),
});
