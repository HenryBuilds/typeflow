import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { webhooks } from "./webhooks";

export const webhookRequests = pgTable("webhook_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookId: uuid("webhook_id")
    .notNull()
    .references(() => webhooks.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  headers: jsonb("headers").$type<Record<string, string>>().notNull(),
  body: jsonb("body").$type<Record<string, unknown>>().notNull(),
  query: jsonb("query").$type<Record<string, string>>().notNull(),
  cookies: jsonb("cookies").$type<Record<string, string>>(),
  rawBody: text("raw_body"),
  url: text("url").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});
