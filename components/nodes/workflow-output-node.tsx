"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Upload, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, Settings2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NodeWrapper } from "./node-wrapper";

interface FieldDefinition {
  name: string;
  type: string;
  description?: string;
}

interface WorkflowOutputNodeData {
  label?: string;
  config?: {
    fields?: FieldDefinition[];
  };
  onEdit?: (nodeId: string) => void;
  onExecute?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  isExecuting?: boolean;
  executionStatus?: "pending" | "running" | "completed" | "failed";
  errorMessage?: string;
  hasBreakpoint?: boolean;
  isBreakpointActive?: boolean;
  onToggleBreakpoint?: (nodeId: string) => void;
}

export const WorkflowOutputNode = memo(({ data, selected, id }: NodeProps<WorkflowOutputNodeData>) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);

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
      return (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 hover:bg-red-100 dark:hover:bg-red-950/30"
          onClick={(e) => {
            e.stopPropagation();
            setShowErrorDialog(true);
          }}
          title="View error details"
        >
          <XCircle className="h-3.5 w-3.5 text-red-500" />
        </Button>
      );
    }
    if (data.executionStatus === "running" || data.isExecuting) {
      return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
    }
    return null;
  };

  const fieldCount = data.config?.fields?.length || 0;

  return (
    <NodeWrapper nodeId={id} hasBreakpoint={data.hasBreakpoint} isBreakpointActive={data.isBreakpointActive} onToggleBreakpoint={data.onToggleBreakpoint}>
      <div
        className={`px-4 py-2 shadow-md rounded-md border-2 transition-all duration-200 min-w-[160px] ${getStatusStyles()}`}
      >
      {/* Only input handle - this is where data goes OUT of the subworkflow */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          <div>
            <div className="font-bold text-sm">{data.label || "Workflow Output"}</div>
            <div className="text-xs text-muted-foreground">
              {fieldCount > 0 ? `${fieldCount} field${fieldCount > 1 ? 's' : ''}` : 'Returns data'}
            </div>
          </div>
          {getStatusIcon()}
        </div>
        <div className="flex items-center gap-1">
          {data.onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit?.(id);
              }}
              title="Configure output fields"
            >
              <Settings2 className="h-3 w-3" />
            </Button>
          )}
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

      {/* Error Details Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Workflow Output Error
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Node:</h4>
                <p className="text-sm text-muted-foreground">{data.label || "Workflow Output"}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Error Message:</h4>
                <pre className="text-xs font-mono bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap break-words text-red-700 dark:text-red-400">
                  {data.errorMessage || "Unknown error"}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </NodeWrapper>
  );
});

WorkflowOutputNode.displayName = "WorkflowOutputNode";
