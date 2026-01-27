import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { workflows } from "./workflows";
import type {
  NodeExecutionResult,
  ExecutionItem,
  DebugStackFrame,
} from "@/types/debugger";

// Define debug session status enum
export const debugSessionStatusEnum = pgEnum("debug_session_status", [
  "active",
  "paused",
  "completed",
  "terminated",
]);

export const debugSessions = pgTable("debug_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  status: debugSessionStatusEnum("status").notNull().default("active"),
  // Current execution state
  currentNodeId: uuid("current_node_id"),
  nextNodeIds: jsonb("next_node_ids").$type<string[]>().default([]),
  // Execution data
  nodeResults: jsonb("node_results").$type<
    Record<string, NodeExecutionResult>
  >(),
  nodeOutputs: jsonb("node_outputs").$type<
    Record<string, ExecutionItem[]>
  >(),
  // Debug configuration
  breakpoints: jsonb("breakpoints").$type<string[]>().default([]),
  callStack: jsonb("call_stack").$type<DebugStackFrame[]>().default([]),
  // Trigger data for resuming
  triggerData: jsonb("trigger_data").$type<Record<string, unknown>>(),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types
export type DebugSessionStatus =
  (typeof debugSessionStatusEnum.enumValues)[number];
