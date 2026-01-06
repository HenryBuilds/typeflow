import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const environments = pgTable('environments', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  // Whether this is a secret (should be encrypted)
  isSecret: boolean('is_secret').default(false).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

