import { pgTable, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

// Define organization role enum
export const organizationRoleEnum = pgEnum("organization_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: organizationRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Export type for TypeScript
export type OrganizationRole = (typeof organizationRoleEnum.enumValues)[number];
