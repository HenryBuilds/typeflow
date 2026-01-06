import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const packages = pgTable(
  "packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    version: text("version").notNull(),
    // Full package.json content for type definitions
    packageJson: jsonb("package_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    // TypeScript type definitions (if available)
    typeDefinitions: text("type_definitions"),
    // Installation metadata
    installedAt: timestamp("installed_at").defaultNow().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    // Dependencies tree
    dependencies: jsonb("dependencies").$type<Record<string, string>>(),
    devDependencies: jsonb("dev_dependencies").$type<Record<string, string>>(),
  },
  (table) => ({
    // Unique constraint: same package name per organization
    uniqueOrgPackage: unique().on(table.organizationId, table.name),
  })
);
