import { pgTable, text, timestamp, uuid, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workflows } from './workflows';

export const nodes = pgTable('nodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'code', 'trigger', 'webhook', 'cron', etc.
  label: text('label').notNull(),
  // Position in the visual editor
  position: jsonb('position').$type<{ x: number; y: number }>().notNull(),
  // Node-specific configuration
  config: jsonb('config').$type<{
    code?: string;
    packageName?: string;
    cronExpression?: string;
    webhookPath?: string;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    [key: string]: unknown;
  }>(),
  // Execution order within workflow
  executionOrder: integer('execution_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations are defined in schema/index.ts to avoid circular dependencies

