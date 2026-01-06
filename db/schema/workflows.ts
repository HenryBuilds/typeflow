import { pgTable, text, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';

export const workflows = pgTable('workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').default('1.0.0').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  // Workflow metadata (view settings, zoom level, etc.)
  metadata: jsonb('metadata').$type<{
    viewport?: { x: number; y: number; zoom: number };
    [key: string]: unknown;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations are defined in schema/index.ts to avoid circular dependencies

