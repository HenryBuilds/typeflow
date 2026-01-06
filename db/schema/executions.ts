import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { workflows } from "./workflows";
import { organizations } from "./organizations";

// Define execution status enum
export const executionStatusEnum = pgEnum("execution_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

// Define trigger type enum
export const triggerTypeEnum = pgEnum("trigger_type", [
  "manual",
  "webhook",
  "cron",
  "api",
]);

export const executions = pgTable("executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  status: executionStatusEnum("status").notNull().default("pending"),
  triggerType: triggerTypeEnum("trigger_type").notNull(),
  triggerData: jsonb("trigger_data").$type<Record<string, unknown>>(),
  // Execution results per node
  nodeResults: jsonb("node_results").$type<
    Record<
      string,
      {
        status: "pending" | "running" | "completed" | "failed";
        output?: unknown;
        error?: string;
        duration?: number;
      }
    >
  >(),
  // Overall execution result
  result: jsonb("result").$type<unknown>(),
  error: text("error"),
  // Timing information
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types for TypeScript
export type ExecutionStatus = (typeof executionStatusEnum.enumValues)[number];
export type TriggerType = (typeof triggerTypeEnum.enumValues)[number];

// Relations are defined in schema/index.ts to avoid circular dependencies
