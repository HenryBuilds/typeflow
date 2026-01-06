import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nodes } from './nodes';

export const connections = pgTable('connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').notNull(), // For quick filtering
  sourceNodeId: uuid('source_node_id')
    .notNull()
    .references(() => nodes.id, { onDelete: 'cascade' }),
  targetNodeId: uuid('target_node_id')
    .notNull()
    .references(() => nodes.id, { onDelete: 'cascade' }),
  // Source and target handles/ports
  sourceHandle: text('source_handle'),
  targetHandle: text('target_handle'),
  // Data transformation/mapping between nodes
  dataMapping: jsonb('data_mapping').$type<Record<string, string>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations are defined in schema/index.ts to avoid circular dependencies

