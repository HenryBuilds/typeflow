import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { organizationRoleEnum } from "./organization-members";

export const organizationInvites = pgTable("organization_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  role: organizationRoleEnum("role").notNull().default("member"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
