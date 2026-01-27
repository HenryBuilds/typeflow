import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { debugSessions, workflows } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { workflowExecutor } from "../services/workflow-executor";
import type {
  DebugSession,
  DebugStackFrame,
  NodeExecutionResult,
  ExecutionItem,
} from "@/types/debugger";

export const debugRouter = router({
  // Create a new debug session
  createSession: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        breakpoints: z.array(z.string().uuid()).default([]),
        triggerData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify workflow exists and belongs to organization
      const workflow = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.id, input.workflowId),
          eq(workflows.organizationId, ctx.organization.id)
        ),
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      // Create debug session
      const [session] = await db
        .insert(debugSessions)
        .values({
          organizationId: ctx.organization.id,
          workflowId: input.workflowId,
          status: "active",
          breakpoints: input.breakpoints,
          triggerData: input.triggerData,
          nodeResults: {},
          nodeOutputs: {},
          callStack: [],
          nextNodeIds: [],
        })
        .returning();

      return session;
    }),

  // Start or resume debug execution
  start: organizationProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await db.query.debugSessions.findFirst({
        where: and(
          eq(debugSessions.id, input.sessionId),
          eq(debugSessions.organizationId, ctx.organization.id)
        ),
      });

      if (!session) {
        throw new Error("Debug session not found");
      }

      if (session.status === "completed" || session.status === "terminated") {
        throw new Error("Debug session has ended");
      }

      // Execute with debug support
      const result = await workflowExecutor.executeWithDebug(
        session.workflowId,
        ctx.organization.id,
        {
          breakpoints: new Set(session.breakpoints || []),
          captureStackTraces: true,
          previousState: session.currentNodeId
            ? {
                nodeResults: (session.nodeResults || {}) as Record<string, NodeExecutionResult>,
                nodeOutputs: new Map(
                  Object.entries((session.nodeOutputs || {}) as Record<string, ExecutionItem[]>)
                ),
                lastExecutedNodeId: session.currentNodeId,
                callStack: (session.callStack || []) as DebugStackFrame[],
              }
            : undefined,
        },
        session.triggerData || undefined
      );

      // Update session with result
      const newStatus = result.isPaused
        ? "paused"
        : result.success
        ? "completed"
        : "terminated";

      const [updatedSession] = await db
        .update(debugSessions)
        .set({
          status: newStatus,
          currentNodeId: result.pausedAtNodeId || null,
          nextNodeIds: result.nextNodeIds,
          nodeResults: result.nodeResults,
          nodeOutputs: result.nodeOutputs,
          callStack: result.callStack,
          updatedAt: new Date(),
        })
        .where(eq(debugSessions.id, input.sessionId))
        .returning();

      return {
        session: updatedSession,
        result,
      };
    }),

  // Step over - execute one node
  stepOver: organizationProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await db.query.debugSessions.findFirst({
        where: and(
          eq(debugSessions.id, input.sessionId),
          eq(debugSessions.organizationId, ctx.organization.id)
        ),
      });

      if (!session) {
        throw new Error("Debug session not found");
      }

      if (session.status !== "paused" && session.status !== "active") {
        throw new Error("Debug session is not in a pausable state");
      }

      // Get the next node to execute
      const nextNodeIds = session.nextNodeIds || [];
      if (nextNodeIds.length === 0) {
        // No more nodes - complete the session
        const [updatedSession] = await db
          .update(debugSessions)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(debugSessions.id, input.sessionId))
          .returning();

        return {
          session: updatedSession,
          result: {
            success: true,
            isPaused: false,
            nodeResults: session.nodeResults,
            nodeOutputs: session.nodeOutputs,
            callStack: session.callStack,
            nextNodeIds: [],
          },
        };
      }

      const targetNodeId = nextNodeIds[0];

      // Execute one node
      const result = await workflowExecutor.executeOneNode(
        session.workflowId,
        ctx.organization.id,
        targetNodeId,
        {
          nodeResults: (session.nodeResults || {}) as Record<string, NodeExecutionResult>,
          nodeOutputs: new Map(
            Object.entries((session.nodeOutputs || {}) as Record<string, ExecutionItem[]>)
          ),
          lastExecutedNodeId: session.currentNodeId || undefined,
          callStack: (session.callStack || []) as DebugStackFrame[],
        },
        session.triggerData || undefined
      );

      // Update session
      const newStatus = result.isPaused
        ? "paused"
        : result.success
        ? "completed"
        : "terminated";

      const [updatedSession] = await db
        .update(debugSessions)
        .set({
          status: newStatus,
          currentNodeId: result.pausedAtNodeId || targetNodeId,
          nextNodeIds: result.nextNodeIds,
          nodeResults: result.nodeResults,
          nodeOutputs: result.nodeOutputs,
          callStack: result.callStack,
          updatedAt: new Date(),
        })
        .where(eq(debugSessions.id, input.sessionId))
        .returning();

      return {
        session: updatedSession,
        result,
      };
    }),

  // Continue execution to next breakpoint
  continue: organizationProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await db.query.debugSessions.findFirst({
        where: and(
          eq(debugSessions.id, input.sessionId),
          eq(debugSessions.organizationId, ctx.organization.id)
        ),
      });

      if (!session) {
        throw new Error("Debug session not found");
      }

      if (session.status !== "paused") {
        throw new Error("Debug session is not paused");
      }

      // Continue execution with breakpoints
      const result = await workflowExecutor.executeWithDebug(
        session.workflowId,
        ctx.organization.id,
        {
          breakpoints: new Set(session.breakpoints || []),
          captureStackTraces: true,
          previousState: {
            nodeResults: (session.nodeResults || {}) as Record<string, NodeExecutionResult>,
            nodeOutputs: new Map(
              Object.entries((session.nodeOutputs || {}) as Record<string, ExecutionItem[]>)
            ),
            lastExecutedNodeId: session.currentNodeId || undefined,
            callStack: (session.callStack || []) as DebugStackFrame[],
          },
        },
        session.triggerData || undefined
      );

      // Update session
      const newStatus = result.isPaused
        ? "paused"
        : result.success
        ? "completed"
        : "terminated";

      const [updatedSession] = await db
        .update(debugSessions)
        .set({
          status: newStatus,
          currentNodeId: result.pausedAtNodeId || null,
          nextNodeIds: result.nextNodeIds,
          nodeResults: result.nodeResults,
          nodeOutputs: result.nodeOutputs,
          callStack: result.callStack,
          updatedAt: new Date(),
        })
        .where(eq(debugSessions.id, input.sessionId))
        .returning();

      return {
        session: updatedSession,
        result,
      };
    }),

  // Terminate debug session
  terminate: organizationProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [session] = await db
        .update(debugSessions)
        .set({
          status: "terminated",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(debugSessions.id, input.sessionId),
            eq(debugSessions.organizationId, ctx.organization.id)
          )
        )
        .returning();

      if (!session) {
        throw new Error("Debug session not found");
      }

      return session;
    }),

  // Get current debug state
  getState: organizationProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const session = await db.query.debugSessions.findFirst({
        where: and(
          eq(debugSessions.id, input.sessionId),
          eq(debugSessions.organizationId, ctx.organization.id)
        ),
      });

      if (!session) {
        throw new Error("Debug session not found");
      }

      return session;
    }),

  // Toggle breakpoint on a node
  toggleBreakpoint: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        nodeId: z.string().uuid(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current workflow metadata
      const workflow = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.id, input.workflowId),
          eq(workflows.organizationId, ctx.organization.id)
        ),
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      const metadata = (workflow.metadata || {}) as Record<string, unknown>;
      const breakpoints = (metadata.breakpoints as string[]) || [];

      let newBreakpoints: string[];
      if (input.enabled) {
        // Add breakpoint if not already present
        newBreakpoints = breakpoints.includes(input.nodeId)
          ? breakpoints
          : [...breakpoints, input.nodeId];
      } else {
        // Remove breakpoint
        newBreakpoints = breakpoints.filter((id) => id !== input.nodeId);
      }

      // Update workflow metadata
      const [updatedWorkflow] = await db
        .update(workflows)
        .set({
          metadata: { ...metadata, breakpoints: newBreakpoints },
        })
        .where(eq(workflows.id, input.workflowId))
        .returning();

      return {
        breakpoints: newBreakpoints,
        workflow: updatedWorkflow,
      };
    }),

  // Get all breakpoints for a workflow
  getBreakpoints: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const workflow = await db.query.workflows.findFirst({
        where: and(
          eq(workflows.id, input.workflowId),
          eq(workflows.organizationId, ctx.organization.id)
        ),
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      const metadata = (workflow.metadata || {}) as Record<string, unknown>;
      const breakpoints = (metadata.breakpoints as string[]) || [];

      return breakpoints;
    }),

  // List debug sessions for a workflow
  listSessions: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      return await db.query.debugSessions.findMany({
        where: and(
          eq(debugSessions.workflowId, input.workflowId),
          eq(debugSessions.organizationId, ctx.organization.id)
        ),
        orderBy: [desc(debugSessions.createdAt)],
        limit: input.limit,
      });
    }),
});
