import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  description: text("description"),
  // Organization settings and metadata
  settings: jsonb("settings").$type<{
    allowPublicWorkflows?: boolean;
    maxWorkflows?: number;
    maxMembers?: number;
    [key: string]: unknown;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

