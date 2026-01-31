import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { workflowVersions, workflows, nodes, connections } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const MAX_VERSIONS_PER_WORKFLOW = 50;

export const workflowVersionsRouter = router({
  // List all versions for a workflow
  list: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return await db.query.workflowVersions.findMany({
        where: and(
          eq(workflowVersions.workflowId, input.workflowId),
          eq(workflowVersions.organizationId, ctx.organization.id)
        ),
        orderBy: [desc(workflowVersions.versionNumber)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // Get a specific version by ID
  getById: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const version = await db.query.workflowVersions.findFirst({
        where: and(
          eq(workflowVersions.id, input.id),
          eq(workflowVersions.organizationId, ctx.organization.id)
        ),
      });

      if (!version) {
        throw new Error("Version not found");
      }

      return version;
    }),

  // Create a version manually (snapshot current state)
  create: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        name: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current workflow state
      const workflow = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.id, input.workflowId),
          eq(workflows.organizationId, ctx.organization.id)
        ),
        with: {
          nodes: true,
        },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      // Get connections
      const workflowConnections = await db.query.connections.findMany({
        where: eq(connections.workflowId, input.workflowId),
      });

      // Get next version number
      const existingVersions = await db.query.workflowVersions.findMany({
        where: eq(workflowVersions.workflowId, input.workflowId),
        orderBy: [desc(workflowVersions.versionNumber)],
        limit: 1,
      });

      const nextVersionNumber = existingVersions.length > 0 
        ? existingVersions[0].versionNumber + 1 
        : 1;

      // Create snapshot
      const snapshot = {
        name: workflow.name,
        description: workflow.description,
        metadata: workflow.metadata,
        nodes: workflow.nodes.map(node => ({
          originalId: node.id,
          type: node.type,
          label: node.label,
          position: node.position as { x: number; y: number },
          config: (node.config || {}) as Record<string, unknown>,
          executionOrder: node.executionOrder,
        })),
        connections: workflowConnections.map(conn => ({
          sourceNodeId: conn.sourceNodeId,
          targetNodeId: conn.targetNodeId,
          sourceHandle: conn.sourceHandle || undefined,
          targetHandle: conn.targetHandle || undefined,
          dataMapping: (conn.dataMapping || undefined) as Record<string, string> | undefined,
        })),
      };

      // Insert new version
      const [version] = await db
        .insert(workflowVersions)
        .values({
          workflowId: input.workflowId,
          organizationId: ctx.organization.id,
          versionNumber: nextVersionNumber,
          name: input.name,
          notes: input.notes,
          snapshot,
        })
        .returning();

      // Clean up old versions (keep only last MAX_VERSIONS_PER_WORKFLOW)
      const allVersions = await db.query.workflowVersions.findMany({
        where: eq(workflowVersions.workflowId, input.workflowId),
        orderBy: [desc(workflowVersions.versionNumber)],
      });

      if (allVersions.length > MAX_VERSIONS_PER_WORKFLOW) {
        const versionsToDelete = allVersions.slice(MAX_VERSIONS_PER_WORKFLOW);
        for (const v of versionsToDelete) {
          await db
            .delete(workflowVersions)
            .where(eq(workflowVersions.id, v.id));
        }
      }

      return version;
    }),

  // Update version name/notes
  update: organizationProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updated] = await db
        .update(workflowVersions)
        .set(updateData)
        .where(
          and(
            eq(workflowVersions.id, id),
            eq(workflowVersions.organizationId, ctx.organization.id)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Version not found");
      }

      return updated;
    }),

  // Delete a specific version
  delete: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(workflowVersions)
        .where(
          and(
            eq(workflowVersions.id, input.id),
            eq(workflowVersions.organizationId, ctx.organization.id)
          )
        );

      return { success: true };
    }),

  // Restore workflow to a specific version
  restore: organizationProcedure
    .input(z.object({
      versionId: z.string().uuid(),
      createBackupVersion: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the version to restore
      const version = await db.query.workflowVersions.findFirst({
        where: and(
          eq(workflowVersions.id, input.versionId),
          eq(workflowVersions.organizationId, ctx.organization.id)
        ),
      });

      if (!version) {
        throw new Error("Version not found");
      }

      const snapshot = version.snapshot;

      // Optionally create a backup of current state before restoring
      if (input.createBackupVersion) {
        const workflow = await db.query.workflows.findFirst({
          where: eq(workflows.id, version.workflowId),
          with: { nodes: true },
        });

        if (workflow) {
          const currentConnections = await db.query.connections.findMany({
            where: eq(connections.workflowId, version.workflowId),
          });

          const existingVersions = await db.query.workflowVersions.findMany({
            where: eq(workflowVersions.workflowId, version.workflowId),
            orderBy: [desc(workflowVersions.versionNumber)],
            limit: 1,
          });

          const nextVersionNumber = existingVersions.length > 0
            ? existingVersions[0].versionNumber + 1
            : 1;

          await db.insert(workflowVersions).values({
            workflowId: version.workflowId,
            organizationId: ctx.organization.id,
            versionNumber: nextVersionNumber,
            name: "Backup before restore",
            notes: `Automatic backup before restoring to version ${version.versionNumber}`,
            snapshot: {
              name: workflow.name,
              description: workflow.description,
              metadata: workflow.metadata,
              nodes: workflow.nodes.map(node => ({
                originalId: node.id,
                type: node.type,
                label: node.label,
                position: node.position as { x: number; y: number },
                config: (node.config || {}) as Record<string, unknown>,
                executionOrder: node.executionOrder,
              })),
              connections: currentConnections.map(conn => ({
                sourceNodeId: conn.sourceNodeId,
                targetNodeId: conn.targetNodeId,
                sourceHandle: conn.sourceHandle || undefined,
                targetHandle: conn.targetHandle || undefined,
                dataMapping: (conn.dataMapping || undefined) as Record<string, string> | undefined,
              })),
            },
          });
        }
      }

      // Update workflow metadata
      await db
        .update(workflows)
        .set({
          name: snapshot.name,
          description: snapshot.description,
          metadata: snapshot.metadata,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, version.workflowId));

      // Delete existing nodes and connections
      await db.delete(nodes).where(eq(nodes.workflowId, version.workflowId));
      await db.delete(connections).where(eq(connections.workflowId, version.workflowId));

      // Insert nodes from snapshot
      let insertedNodes: Array<typeof nodes.$inferSelect> = [];
      if (snapshot.nodes.length > 0) {
        insertedNodes = await db
          .insert(nodes)
          .values(
            snapshot.nodes.map(node => ({
              workflowId: version.workflowId,
              organizationId: ctx.organization.id,
              type: node.type,
              label: node.label,
              position: node.position,
              config: node.config,
              executionOrder: node.executionOrder,
            }))
          )
          .returning();
      }

      // Create node ID mapping (old ID -> new ID)
      const nodeIdMap = new Map<string, string>();
      snapshot.nodes.forEach((node, index) => {
        if (insertedNodes[index] && node.originalId) {
          nodeIdMap.set(node.originalId, insertedNodes[index].id);
        }
      });

      // Insert connections from snapshot with mapped node IDs
      if (snapshot.connections.length > 0) {
        await db.insert(connections).values(
          snapshot.connections.map(conn => ({
            organizationId: ctx.organization.id,
            workflowId: version.workflowId,
            sourceNodeId: nodeIdMap.get(conn.sourceNodeId) || conn.sourceNodeId,
            targetNodeId: nodeIdMap.get(conn.targetNodeId) || conn.targetNodeId,
            sourceHandle: conn.sourceHandle,
            targetHandle: conn.targetHandle,
            dataMapping: conn.dataMapping,
          }))
        );
      }

      return { success: true, workflowId: version.workflowId };
    }),
});
