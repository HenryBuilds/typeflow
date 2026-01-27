import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// Export all schemas
export * from "./organizations";
export * from "./users";
export * from "./organization-members";
export * from "./workflows";
export * from "./nodes";
export * from "./connections";
export * from "./packages";
export * from "./executions";
export * from "./logs";
export * from "./webhooks";
export * from "./webhook-requests";
export * from "./environments";
export * from "./credentials";
export * from "./debug-sessions";

// Import tables for relations
import { organizations } from "./organizations";
import { users } from "./users";
import { organizationMembers } from "./organization-members";
import { workflows } from "./workflows";
import { nodes } from "./nodes";
import { connections } from "./connections";
import { executions } from "./executions";
import { logs } from "./logs";
import { webhooks } from "./webhooks";
import { webhookRequests } from "./webhook-requests";
import { packages } from "./packages";
import { environments } from "./environments";
import { credentials } from "./credentials";

// Define all relations here to avoid circular dependencies
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  workflows: many(workflows),
  packages: many(packages),
  environments: many(environments),
  webhooks: many(webhooks),
  executions: many(executions),
  logs: many(logs),
  credentials: many(credentials),
}));

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  })
);

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workflows.organizationId],
    references: [organizations.id],
  }),
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
  organization: one(organizations, {
    fields: [connections.organizationId],
    references: [organizations.id],
  }),
  sourceNode: one(nodes, {
    fields: [connections.sourceNodeId],
    references: [nodes.id],
    relationName: "source",
  }),
  targetNode: one(nodes, {
    fields: [connections.targetNodeId],
    references: [nodes.id],
    relationName: "target",
  }),
}));

export const packagesRelations = relations(packages, ({ one }) => ({
  organization: one(organizations, {
    fields: [packages.organizationId],
    references: [organizations.id],
  }),
}));

export const environmentsRelations = relations(environments, ({ one }) => ({
  organization: one(organizations, {
    fields: [environments.organizationId],
    references: [organizations.id],
  }),
}));

export const executionsRelations = relations(executions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [executions.organizationId],
    references: [organizations.id],
  }),
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
  logs: many(logs),
}));

export const logsRelations = relations(logs, ({ one }) => ({
  organization: one(organizations, {
    fields: [logs.organizationId],
    references: [organizations.id],
  }),
  execution: one(executions, {
    fields: [logs.executionId],
    references: [executions.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [webhooks.organizationId],
    references: [organizations.id],
  }),
  workflow: one(workflows, {
    fields: [webhooks.workflowId],
    references: [workflows.id],
  }),
  requests: many(webhookRequests),
}));

export const webhookRequestsRelations = relations(webhookRequests, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookRequests.webhookId],
    references: [webhooks.id],
  }),
}));

export const credentialsRelations = relations(credentials, ({ one }) => ({
  organization: one(organizations, {
    fields: [credentials.organizationId],
    references: [organizations.id],
  }),
}));

// Export inferred types
export type Organization = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type OrganizationMember = InferSelectModel<typeof organizationMembers>;
export type NewOrganizationMember = InferInsertModel<typeof organizationMembers>;

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

export type WebhookRequest = InferSelectModel<typeof webhookRequests>;
export type NewWebhookRequest = InferInsertModel<typeof webhookRequests>;

export type Environment = InferSelectModel<typeof environments>;
export type NewEnvironment = InferInsertModel<typeof environments>;

export type Credential = InferSelectModel<typeof credentials>;
export type NewCredential = InferInsertModel<typeof credentials>;
