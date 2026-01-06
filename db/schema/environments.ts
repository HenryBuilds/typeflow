import { pgTable, text, timestamp, uuid, boolean, unique } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const environments = pgTable(
  "environments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    // Whether this is a secret (should be encrypted)
    isSecret: boolean("is_secret").default(false).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: same key per organization
    uniqueOrgKey: unique().on(table.organizationId, table.key),
  })
);

