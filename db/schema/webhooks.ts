import { pgTable, text, timestamp, uuid, boolean, jsonb, unique, integer } from "drizzle-orm/pg-core";
import { workflows } from "./workflows";
import { organizations } from "./organizations";

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    path: text("path").notNull(), // e.g., '/webhook/abc123'
    method: text("method").default("POST").notNull(), // 'GET', 'POST', 'PUT', etc.
    responseMode: text("response_mode").default("waitForResult").notNull(), // 'waitForResult' | 'respondImmediately'
    isActive: boolean("is_active").default(true).notNull(),
    // Authentication/authorization
    authType: text("auth_type"), // 'none', 'api_key', 'bearer', 'basic'
    authConfig: jsonb("auth_config").$type<Record<string, unknown>>(),
    // Request validation schema
    requestSchema: jsonb("request_schema").$type<Record<string, unknown>>(),
    // Rate limiting (requests per minute, 0 = unlimited)
    rateLimit: integer("rate_limit").default(100).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: same path per organization
    uniqueOrgPath: unique().on(table.organizationId, table.path),
  })
);

// Relations are defined in schema/index.ts to avoid circular dependencies

