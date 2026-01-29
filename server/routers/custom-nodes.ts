import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { customNodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { INodeTypeDescription } from "@/db/schema/custom-nodes";

// Zod schema for node property
const nodePropertySchema = z.object({
  displayName: z.string(),
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "options", "multiOptions", "json", "collection"]),
  default: z.unknown().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({
    name: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
    description: z.string().optional(),
  })).optional(),
  typeOptions: z.object({
    multipleValues: z.boolean().optional(),
    password: z.boolean().optional(),
    rows: z.number().optional(),
  }).optional(),
});

// Zod schema for typeflow-style node description
const nodeDescriptionSchema = z.object({
  displayName: z.string().min(1),
  name: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9]*$/, "Name must be alphanumeric and start with a letter"),
  group: z.array(z.string()).default(["custom"]),
  version: z.number().default(1),
  description: z.string().default(""),
  icon: z.string().optional(),
  color: z.string().optional(),
  inputs: z.array(z.string()).default(["main"]),
  outputs: z.array(z.string()).default(["main"]),
  credentials: z.array(z.object({
    name: z.string(),
    required: z.boolean(),
  })).optional(),
  properties: z.array(nodePropertySchema).default([]),
});

export const customNodesRouter = router({
  // List all custom nodes for the organization
  list: organizationProcedure
    .query(async ({ ctx }) => {
      return await db.query.customNodes.findMany({
        where: eq(customNodes.organizationId, ctx.organization.id),
        orderBy: (nodes, { desc }) => [desc(nodes.updatedAt)],
      });
    }),

  // List only published custom nodes (for palette)
  listPublished: organizationProcedure
    .query(async ({ ctx }) => {
      return await db.query.customNodes.findMany({
        where: and(
          eq(customNodes.organizationId, ctx.organization.id),
          eq(customNodes.isPublished, true)
        ),
        orderBy: (nodes, { asc }) => [asc(nodes.description)],
      });
    }),

  // Get a single custom node by ID
  get: organizationProcedure
    .input(z.object({
      organizationId: z.string(),
      id: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const node = await db.query.customNodes.findFirst({
        where: and(
          eq(customNodes.id, input.id),
          eq(customNodes.organizationId, ctx.organization.id)
        ),
      });

      if (!node) {
        throw new Error("Custom node not found");
      }

      return node;
    }),

  // Get a custom node by its type name (for execution)
  getByType: organizationProcedure
    .input(z.object({
      organizationId: z.string(),
      typeName: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const allNodes = await db.query.customNodes.findMany({
        where: eq(customNodes.organizationId, ctx.organization.id),
      });

      // Find node by matching description.name
      const node = allNodes.find(n => {
        const desc = n.description as INodeTypeDescription;
        return desc.name === input.typeName;
      });

      if (!node) {
        throw new Error(`Custom node type '${input.typeName}' not found`);
      }

      return node;
    }),

  // Create a new custom node
  create: organizationProcedure
    .input(z.object({
      organizationId: z.string(),
      description: nodeDescriptionSchema,
      executeCode: z.string().min(1),
      typeDefinitions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if node with same name already exists
      const existingNodes = await db.query.customNodes.findMany({
        where: eq(customNodes.organizationId, ctx.organization.id),
      });

      const nameExists = existingNodes.some(n => {
        const desc = n.description as INodeTypeDescription;
        return desc.name === input.description.name;
      });

      if (nameExists) {
        throw new Error(`A custom node with name '${input.description.name}' already exists`);
      }

      const [newNode] = await db.insert(customNodes).values({
        organizationId: ctx.organization.id,
        description: input.description as INodeTypeDescription,
        executeCode: input.executeCode,
        typeDefinitions: input.typeDefinitions,
        isPublished: false,
        version: 1,
      }).returning();

      return newNode;
    }),

  // Update an existing custom node
  update: organizationProcedure
    .input(z.object({
      organizationId: z.string(),
      id: z.string().uuid(),
      description: nodeDescriptionSchema.optional(),
      executeCode: z.string().optional(),
      typeDefinitions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.customNodes.findFirst({
        where: and(
          eq(customNodes.id, input.id),
          eq(customNodes.organizationId, ctx.organization.id)
        ),
      });

      if (!existing) {
        throw new Error("Custom node not found");
      }

      // If updating name, check for duplicates
      if (input.description?.name) {
        const allNodes = await db.query.customNodes.findMany({
          where: eq(customNodes.organizationId, ctx.organization.id),
        });

        const nameExists = allNodes.some(n => {
          if (n.id === input.id) return false;
          const desc = n.description as INodeTypeDescription;
          return desc.name === input.description?.name;
        });

        if (nameExists) {
          throw new Error(`A custom node with name '${input.description.name}' already exists`);
        }
      }

      const updateData: Partial<typeof customNodes.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.description) {
        updateData.description = input.description as INodeTypeDescription;
      }
      if (input.executeCode !== undefined) {
        updateData.executeCode = input.executeCode;
      }
      if (input.typeDefinitions !== undefined) {
        updateData.typeDefinitions = input.typeDefinitions;
      }

      const [updated] = await db
        .update(customNodes)
        .set(updateData)
        .where(
          and(
            eq(customNodes.id, input.id),
            eq(customNodes.organizationId, ctx.organization.id)
          )
        )
        .returning();

      return updated;
    }),

  // Publish a custom node (make it available in the palette)
  publish: organizationProcedure
    .input(z.object({
      organizationId: z.string(),
      id: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(customNodes)
        .set({ isPublished: true, updatedAt: new Date() })
        .where(
          and(
            eq(customNodes.id, input.id),
            eq(customNodes.organizationId, ctx.organization.id)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Custom node not found");
      }

      return updated;
    }),

  // Unpublish a custom node
  unpublish: organizationProcedure
    .input(z.object({
      organizationId: z.string(),
      id: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(customNodes)
        .set({ isPublished: false, updatedAt: new Date() })
        .where(
          and(
            eq(customNodes.id, input.id),
            eq(customNodes.organizationId, ctx.organization.id)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Custom node not found");
      }

      return updated;
    }),

  // Delete a custom node
  delete: organizationProcedure
    .input(z.object({
      organizationId: z.string(),
      id: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(customNodes)
        .where(
          and(
            eq(customNodes.id, input.id),
            eq(customNodes.organizationId, ctx.organization.id)
          )
        );

      return { success: true };
    }),
});
