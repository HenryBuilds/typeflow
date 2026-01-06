import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// Export all schemas
export * from "./workflows";
export * from "./nodes";
export * from "./connections";
export * from "./packages";
export * from "./executions";
export * from "./logs";
export * from "./webhooks";
export * from "./environments";

// Import tables for relations
import { workflows } from "./workflows";
import { nodes } from "./nodes";
import { connections } from "./connections";
import { executions } from "./executions";
import { logs } from "./logs";
import { webhooks } from "./webhooks";
import { packages } from "./packages";
import { environments } from "./environments";

// Define all relations here to avoid circular dependencies
export const workflowsRelations = relations(workflows, ({ many }) => ({
  nodes: many(nodes),
  executions: many(executions),
  webhooks: many(webhooks),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [nodes.workflowId],
    references: [workflows.id],
  }),
  sourceConnections: many(connections, {
    relationName: 'source',
  }),
  targetConnections: many(connections, {
    relationName: 'target',
  }),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  sourceNode: one(nodes, {
    fields: [connections.sourceNodeId],
    references: [nodes.id],
    relationName: 'source',
  }),
  targetNode: one(nodes, {
    fields: [connections.targetNodeId],
    references: [nodes.id],
    relationName: 'target',
  }),
}));

export const executionsRelations = relations(executions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
  logs: many(logs),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  execution: one(executions, {
    fields: [logs.executionId],
    references: [executions.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  workflow: one(workflows, {
    fields: [webhooks.workflowId],
    references: [workflows.id],
  }),
}));

// Export inferred types
export type Workflow = InferSelectModel<typeof workflows>;
export type NewWorkflow = InferInsertModel<typeof workflows>;

export type Node = InferSelectModel<typeof nodes>;
export type NewNode = InferInsertModel<typeof nodes>;

export type Connection = InferSelectModel<typeof connections>;
export type NewConnection = InferInsertModel<typeof connections>;

export type Package = InferSelectModel<typeof packages>;
export type NewPackage = InferInsertModel<typeof packages>;

export type Execution = InferSelectModel<typeof executions>;
export type NewExecution = InferInsertModel<typeof executions>;

export type Log = InferSelectModel<typeof logs>;
export type NewLog = InferInsertModel<typeof logs>;

export type Webhook = InferSelectModel<typeof webhooks>;
export type NewWebhook = InferInsertModel<typeof webhooks>;

export type Environment = InferSelectModel<typeof environments>;
export type NewEnvironment = InferInsertModel<typeof environments>;

