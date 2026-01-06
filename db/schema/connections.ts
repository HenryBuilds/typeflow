import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { nodes } from "./nodes";
import { organizations } from "./organizations";

export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id").notNull(), // For quick filtering
  sourceNodeId: uuid("source_node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  // Source and target handles/ports
  sourceHandle: text("source_handle"),
  targetHandle: text("target_handle"),
  // Data transformation/mapping between nodes
  dataMapping: jsonb("data_mapping").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations are defined in schema/index.ts to avoid circular dependencies

