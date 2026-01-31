import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { workflows } from "./workflows";
import { organizations } from "./organizations";

export const workflowVersions = pgTable("workflow_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  name: text("name"),
  notes: text("notes"),
  snapshot: jsonb("snapshot").$type<{
    name: string;
    description: string | null;
    metadata: Record<string, unknown> | null;
    nodes: Array<{
      originalId: string; // Store original node ID for connection mapping
      type: string;
      label: string;
      position: { x: number; y: number };
      config: Record<string, unknown>;
      executionOrder: number;
    }>;
    connections: Array<{
      sourceNodeId: string;
      targetNodeId: string;
      sourceHandle?: string;
      targetHandle?: string;
      dataMapping?: Record<string, string>;
    }>;
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
});
