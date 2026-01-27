// Debug types for workflow debugging with breakpoints

// Execution item structure (matches workflow-executor.ts)
export interface ExecutionItem {
  json: Record<string, unknown>;
  binary?: Record<string, unknown>;
  pairedItem?: {
    item: number;
  };
}

// Node execution result (matches workflow-executor.ts)
export interface NodeExecutionResult {
  nodeId: string;
  nodeLabel?: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: ExecutionItem[];
  error?: string;
  duration?: number;
}

// Debug session status
export type DebugSessionStatus = "active" | "paused" | "completed" | "terminated";

// Debug session stored in database
export interface DebugSession {
  id: string;
  organizationId: string;
  workflowId: string;
  status: DebugSessionStatus;
  currentNodeId?: string;
  nextNodeIds: string[];
  nodeResults: Record<string, NodeExecutionResult>;
  nodeOutputs: Record<string, ExecutionItem[]>;
  breakpoints: string[];
  callStack: DebugStackFrame[];
  triggerData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Stack frame for debugging - tracks execution path
export interface DebugStackFrame {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  timestamp: number;
  input?: ExecutionItem[];
  output?: ExecutionItem[];
  error?: string;
  sourceLocation?: SourceLocation;
}

// Source location for TypeScript stack traces
export interface SourceLocation {
  line: number;
  column: number;
  code: string;
  fileName?: string;
}

// Frontend debug state
export interface DebugState {
  session: DebugSession | null;
  isDebugging: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  executedNodeIds: string[];
}

// Debug execution options for WorkflowExecutor
export interface DebugExecutionOptions {
  breakpoints: Set<string>;
  stopAtNode?: string;
  captureStackTraces?: boolean;
  previousState?: DebugPreviousState;
}

// Previous state for resuming execution
export interface DebugPreviousState {
  nodeResults: Record<string, NodeExecutionResult>;
  nodeOutputs: Record<string, ExecutionItem[]>;
  lastExecutedNodeId?: string;
  callStack: DebugStackFrame[];
}

// Debug execution result
export interface DebugExecutionResult {
  success: boolean;
  nodeResults: Record<string, NodeExecutionResult>;
  nodeOutputs: Record<string, ExecutionItem[]>;
  finalOutput?: ExecutionItem[];
  error?: string;
  // Debug-specific fields
  isPaused: boolean;
  pausedAtNodeId?: string;
  nextNodeIds: string[];
  callStack: DebugStackFrame[];
}

// Breakpoint info (for potential conditional breakpoints in future)
export interface BreakpointInfo {
  nodeId: string;
  enabled: boolean;
  condition?: string;
  hitCount?: number;
}

// Workflow metadata extension for breakpoints
export interface WorkflowDebugMetadata {
  breakpoints?: string[];
  debugSettings?: {
    pauseOnError: boolean;
    captureStackTraces: boolean;
  };
}
