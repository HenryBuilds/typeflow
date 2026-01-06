import { pgTable, text, timestamp, uuid, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { executions } from "./executions";
import { organizations } from "./organizations";

// Define log level enum
export const logLevelEnum = pgEnum("log_level", [
  "info",
  "warn",
  "error",
  "debug",
]);

export const logs = pgTable("logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  executionId: uuid("execution_id")
    .notNull()
    .references(() => executions.id, { onDelete: "cascade" }),
  nodeId: uuid("node_id"), // Optional: specific node that generated the log
  level: logLevelEnum("level").notNull(),
  message: text("message").notNull(),
  // Additional log data
  data: jsonb("data").$type<Record<string, unknown>>(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Export type for TypeScript
export type LogLevel = (typeof logLevelEnum.enumValues)[number];

// Relations are defined in schema/index.ts to avoid circular dependencies

