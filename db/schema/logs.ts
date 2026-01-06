import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { executions } from './executions';

export const logs = pgTable('logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  executionId: uuid('execution_id')
    .notNull()
    .references(() => executions.id, { onDelete: 'cascade' }),
  nodeId: uuid('node_id'), // Optional: specific node that generated the log
  level: text('level').notNull(), // 'info', 'warn', 'error', 'debug'
  message: text('message').notNull(),
  // Additional log data
  data: jsonb('data').$type<Record<string, unknown>>(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Relations are defined in schema/index.ts to avoid circular dependencies

