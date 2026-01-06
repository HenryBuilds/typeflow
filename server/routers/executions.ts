import { z } from "zod";
import { router, organizationProcedure } from "../trpc";
import { db } from "@/db/db";
import { executions, logs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  executionStatusEnum,
  triggerTypeEnum,
  type ExecutionStatus,
} from "@/db/schema/executions";

export const executionsRouter = router({
  // List executions for organization
  list: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [eq(executions.organizationId, ctx.organization.id)];

      if (input.workflowId) {
        whereConditions.push(eq(executions.workflowId, input.workflowId));
      }

      return await db.query.executions.findMany({
        where: and(...whereConditions),
        orderBy: [desc(executions.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // Get execution by ID with logs
  getById: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const execution = await db.query.executions.findFirst({
        where: and(
          eq(executions.id, input.id),
          eq(executions.organizationId, ctx.organization.id)
        ),
        with: {
          logs: {
            orderBy: (logs, { asc }) => [asc(logs.timestamp)],
          },
        },
      });

      if (!execution) {
        throw new Error("Execution not found");
      }

      return execution;
    }),

  // Create new execution
  create: organizationProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        triggerType: z.enum(["manual", "webhook", "cron", "api"]),
        triggerData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [execution] = await db
        .insert(executions)
        .values({
          organizationId: ctx.organization.id,
          workflowId: input.workflowId,
          triggerType: input.triggerType,
          triggerData: input.triggerData,
          status: "pending",
        })
        .returning();

      return execution;
    }),

  // Update execution status
  updateStatus: organizationProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "pending",
          "running",
          "completed",
          "failed",
          "cancelled",
        ]),
        result: z.unknown().optional(),
        error: z.string().optional(),
        nodeResults: z
          .record(
            z.string(),
            z.object({
              status: z.enum(["pending", "running", "completed", "failed"]),
              output: z.unknown().optional(),
              error: z.string().optional(),
              duration: z.number().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: {
        status: ExecutionStatus;
        result?: unknown;
        error?: string;
        nodeResults?: Record<
          string,
          {
            status: "pending" | "running" | "completed" | "failed";
            output?: unknown;
            error?: string;
            duration?: number;
          }
        >;
        startedAt?: Date;
        completedAt?: Date;
        duration?: number;
      } = {
        status: input.status as ExecutionStatus,
      };

      if (input.status === "running" && !input.result) {
        updateData.startedAt = new Date();
      }

      if (
        (input.status === "completed" || input.status === "failed") &&
        !input.result
      ) {
        updateData.completedAt = new Date();
        if (updateData.startedAt) {
          updateData.duration =
            updateData.completedAt.getTime() - updateData.startedAt.getTime();
        }
      }

      if (input.result !== undefined) {
        updateData.result = input.result;
      }

      if (input.error !== undefined) {
        updateData.error = input.error;
      }

      if (input.nodeResults !== undefined) {
        updateData.nodeResults = input.nodeResults as Record<
          string,
          {
            status: "pending" | "running" | "completed" | "failed";
            output?: unknown;
            error?: string;
            duration?: number;
          }
        >;
      }

      const [updated] = await db
        .update(executions)
        .set(updateData)
        .where(
          and(
            eq(executions.id, input.id),
            eq(executions.organizationId, ctx.organization.id)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Execution not found");
      }

      return updated;
    }),

  // Cancel execution
  cancel: organizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(executions)
        .set({
          status: "cancelled",
          completedAt: new Date(),
        })
        .where(
          and(
            eq(executions.id, input.id),
            eq(executions.organizationId, ctx.organization.id)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Execution not found");
      }

      return updated;
    }),

  // Add log to execution
  addLog: organizationProcedure
    .input(
      z.object({
        executionId: z.string().uuid(),
        nodeId: z.string().uuid().optional(),
        level: z.enum(["info", "warn", "error", "debug"]),
        message: z.string(),
        data: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify execution belongs to organization
      const execution = await db.query.executions.findFirst({
        where: and(
          eq(executions.id, input.executionId),
          eq(executions.organizationId, ctx.organization.id)
        ),
      });

      if (!execution) {
        throw new Error("Execution not found");
      }

      const [log] = await db
        .insert(logs)
        .values({
          organizationId: ctx.organization.id,
          executionId: input.executionId,
          nodeId: input.nodeId,
          level: input.level,
          message: input.message,
          data: input.data,
        })
        .returning();

      return log;
    }),
});

