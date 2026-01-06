import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Authentication
  passwordHash: text("password_hash"),
  // Account status
  isActive: boolean("is_active").default(true).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
