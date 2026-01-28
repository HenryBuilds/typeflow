export interface Workflow {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  version: string;
  isActive: boolean;
  metadata: {
    viewport?: { x: number; y: number; zoom: number };
    [key: string]: unknown;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
}

export interface WorkflowNode {
  id: string;
  workflowId: string;
  type: string;
  label: string;
  position: { x: number; y: number }; // Enforced as not null in DB, so no optional here from DB perspective, but let's check DB usage. DB says .notNull()
  config: Record<string, unknown> | null;
  executionOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowConnection {
  id: string;
  organizationId: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  dataMapping: Record<string, string> | null;
  createdAt: Date;
}
