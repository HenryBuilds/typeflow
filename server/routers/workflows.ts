import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { workflows, nodes, connections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const workflowsRouter = router({
  // List all workflows in organization
  list: organizationProcedure.query(async ({ ctx }) => {
    return await db.query.workflows.findMany({
      where: eq(workflows.organizationId, ctx.organization.id),
      orderBy: (wf, { desc }) => [desc(wf.createdAt)],
    });
  }),

  // Get workflow by ID with nodes and connections
  getById: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const workflow = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.id, input.id),
          eq(workflows.organizationId, ctx.organization.id)
        ),
        with: {
          nodes: {
            orderBy: (nodes, { asc }) => [asc(nodes.executionOrder)],
          },
          executions: {
            limit: 10,
            orderBy: (executions, { desc }) => [desc(executions.createdAt)],
          },
        },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      // Get connections for this workflow
      const workflowConnections = await db.query.connections.findMany({
        where: eq(connections.workflowId, input.id),
      });

      return {
        ...workflow,
        connections: workflowConnections,
      };
    }),

  // Create new workflow
  create: organizationProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        version: z.string().default("1.0.0"),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [workflow] = await db
        .insert(workflows)
        .values({
          organizationId: ctx.organization.id,
          name: input.name,
          description: input.description,
          version: input.version,
          metadata: input.metadata,
        })
        .returning();

      return workflow;
    }),

  // Update workflow
  update: organizationProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        version: z.string().optional(),
        isActive: z.boolean().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updated] = await db
        .update(workflows)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workflows.id, id),
            eq(workflows.organizationId, ctx.organization.id)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Workflow not found");
      }

      return updated;
    }),

  // Delete workflow
  delete: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(workflows)
        .where(
          and(
            eq(workflows.id, input.id),
            eq(workflows.organizationId, ctx.organization.id)
          )
        );

      return { success: true };
    }),

  // Save workflow with nodes and connections
  save: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid().optional(),
        workflow: z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          version: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
        nodes: z.array(
          z.object({
            id: z.string().optional(), // Allow any string ID (temporary IDs from frontend)
            type: z.string(),
            label: z.string(),
            position: z.object({ x: z.number(), y: z.number() }),
            config: z.record(z.string(), z.unknown()).optional(),
            executionOrder: z.number().optional(),
          })
        ),
        connections: z.array(
          z.object({
            id: z.string().optional(), // Allow any string ID (temporary IDs from frontend)
            sourceNodeId: z.string(), // Will be mapped to UUID
            targetNodeId: z.string(), // Will be mapped to UUID
            sourceHandle: z.string().optional(),
            targetHandle: z.string().optional(),
            dataMapping: z.record(z.string(), z.string()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let workflowId = input.workflowId;

      // Create or update workflow
      if (workflowId) {
        const [updated] = await db
          .update(workflows)
          .set({
            ...input.workflow,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(workflows.id, workflowId),
              eq(workflows.organizationId, ctx.organization.id)
            )
          )
          .returning();

        if (!updated) {
          throw new Error("Workflow not found");
        }
      } else {
        const [created] = await db
          .insert(workflows)
          .values({
            organizationId: ctx.organization.id,
            ...input.workflow,
          })
          .returning();

        workflowId = created.id;
      }

      // Delete existing nodes and connections
      await db.delete(nodes).where(eq(nodes.workflowId, workflowId));
      await db
        .delete(connections)
        .where(eq(connections.workflowId, workflowId));

      // Insert new nodes (only if there are any)
      let insertedNodes: Array<typeof nodes.$inferSelect> = [];
      if (input.nodes.length > 0) {
        const nodeValues = input.nodes.map((node) => ({
          workflowId,
          organizationId: ctx.organization.id,
          type: node.type,
          label: node.label,
          position: node.position,
          config: node.config || {},
          executionOrder: node.executionOrder ?? 0,
        }));

        insertedNodes = await db.insert(nodes).values(nodeValues).returning();
      }

      // Create node ID mapping (for nodes that had temporary IDs)
      const nodeIdMap = new Map<string, string>();
      input.nodes.forEach((node, index) => {
        if (insertedNodes[index]) {
          const dbNodeId = insertedNodes[index].id;
          // Map temporary ID to database ID, or use database ID as both key and value
          if (node.id) {
            nodeIdMap.set(node.id, dbNodeId);
          }
          // Also map database ID to itself for direct lookups
          nodeIdMap.set(dbNodeId, dbNodeId);
        }
      });

      // Insert connections with mapped node IDs (only if there are any)
      if (input.connections.length > 0) {
        await db.insert(connections).values(
          input.connections.map((conn) => ({
            organizationId: ctx.organization.id,
            workflowId,
            sourceNodeId: nodeIdMap.get(conn.sourceNodeId) ?? conn.sourceNodeId,
            targetNodeId: nodeIdMap.get(conn.targetNodeId) ?? conn.targetNodeId,
            sourceHandle: conn.sourceHandle,
            targetHandle: conn.targetHandle,
            dataMapping: conn.dataMapping,
          }))
        );
      }

      return { id: workflowId };
    }),
});
