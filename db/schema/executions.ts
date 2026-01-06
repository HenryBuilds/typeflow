import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { workflows } from "./workflows";

export const executions = pgTable("executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  triggerType: text("trigger_type").notNull(), // 'manual', 'webhook', 'cron', 'api'
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

// Relations are defined in schema/index.ts to avoid circular dependencies
