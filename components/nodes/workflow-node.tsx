"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Workflow, Play, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkflowNodeData {
  label?: string;
  onExecute?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  isExecuting?: boolean;
  executionStatus?: "pending" | "running" | "completed" | "failed";
  errorMessage?: string;
}

export const WorkflowNode = memo(({ data, selected, id }: NodeProps<WorkflowNodeData>) => {
  // Determine border and background color based on execution status
  const getStatusStyles = () => {
    if (data.executionStatus === "completed") {
      return "border-green-500 bg-green-50 dark:bg-green-950/20";
    }
    if (data.executionStatus === "failed") {
      return "border-red-500 bg-red-50 dark:bg-red-950/20";
    }
    if (data.executionStatus === "running" || data.isExecuting) {
      return "border-blue-500 bg-blue-50 dark:bg-blue-950/20 animate-pulse";
    }
    if (selected) {
      return "border-blue-500 bg-white dark:bg-gray-800";
    }
    return "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800";
  };

  const getStatusIcon = () => {
    if (data.executionStatus === "completed") {
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    }
    if (data.executionStatus === "failed") {
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    }
    if (data.executionStatus === "running" || data.isExecuting) {
      return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
    }
    return null;
  };

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 transition-all duration-200 ${getStatusStyles()}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4" />
          <div className="font-bold text-sm">{data.label || "Node"}</div>
          {getStatusIcon()}
        </div>
        <div className="flex items-center gap-1">
          {data.onExecute && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                data.onExecute?.(id);
              }}
              disabled={data.isExecuting || data.executionStatus === "running"}
              title="Execute until here"
            >
              <Play className={`h-3 w-3 ${data.isExecuting ? 'animate-pulse' : ''}`} />
            </Button>
          )}
          {data.onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.(id);
              }}
              title="Delete node"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Show error message */}
      {data.errorMessage && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
          <div className="font-semibold mb-1 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Error:
          </div>
          <div className="whitespace-pre-wrap break-words max-h-24 overflow-auto">
            {data.errorMessage}
          </div>
        </div>
      )}
      
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  );
});

WorkflowNode.displayName = "WorkflowNode";

