export interface ExecutionItem {
  json: Record<string, unknown>;
  binary?: Record<string, unknown>;
  pairedItem?: {
    item: number;
  };
}

export interface NodeExecutionResult {
  nodeId: string;
  nodeLabel?: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: ExecutionItem[];
  error?: string;
  duration?: number;
}

export interface WorkflowExecutionResult {
  success: boolean;
  nodeResults: Record<string, NodeExecutionResult>;
  finalOutput?: ExecutionItem[];
  error?: string;
}

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
