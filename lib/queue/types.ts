export interface WorkflowJobData {
  workflowId: string;
  organizationId: string;
  trigger: "manual" | "webhook" | "schedule" | "chat";
  input?: Record<string, unknown>;
  userId?: string;
  webhookPath?: string;
}

export interface WorkflowJobResult {
  success: boolean;
  outputs: Record<string, unknown>;
  executionTime: number;
  error?: string;
  nodeResults?: Record<string, unknown>;
}

export type JobState = 
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused";

export type WebhookResponseMode = "waitForResult" | "respondImmediately";
