"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GitMerge, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, Settings2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NodeWrapper } from "./node-wrapper";

interface MergeNodeData {
  label?: string;
  config?: {
    mode?: "append" | "combine" | "chooseBranch" | "multiplex";
    combineMode?: "mergeByPosition" | "mergeByKey" | "allCombinations";
    joinField?: string;
    inputCount?: number;
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

export const MergeNode = memo(({ data, selected, id }: NodeProps<MergeNodeData>) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  
  // Dynamic input count (default 2, min 2, max 10)
  const inputCount = Math.max(2, Math.min(10, data.config?.inputCount || 2));

  const handleDoubleClick = () => {
    if (data.onEdit) {
      data.onEdit(id);
    }
  };

  const getStatusStyles = () => {
    if (data.executionStatus === "completed") {
      return "node-card-completed";
    }
    if (data.executionStatus === "failed") {
      return "node-card-failed";
    }
    if (data.executionStatus === "running" || data.isExecuting) {
      return "node-card-running";
    }
    if (data.isBreakpointActive) {
      return "border-yellow-400 dark:border-yellow-500 bg-yellow-50/80 dark:bg-yellow-950/40 shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/30";
    }
    if (selected) {
      return "node-card-selected";
    }
    return "node-card";
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

  const modeLabels: Record<string, string> = {
    append: "Append",
    combine: "Combine",
    chooseBranch: "Choose Branch",
    multiplex: "Multiplex",
  };

  return (
    <NodeWrapper nodeId={id} hasBreakpoint={data.hasBreakpoint} isBreakpointActive={data.isBreakpointActive} onToggleBreakpoint={data.onToggleBreakpoint}>
      <div
        className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 min-w-[160px] cursor-pointer ${getStatusStyles()}`}
        onDoubleClick={handleDoubleClick}
        title="Double-click to configure"
      >
      {/* Dynamic input handles based on inputCount */}
      {Array.from({ length: inputCount }, (_, i) => (
        <Handle
          key={`input${i + 1}`}
          type="target"
          position={Position.Top}
          id={`input${i + 1}`}
          className="w-3 h-3 !bg-gray-500"
          style={{ left: `${((i + 1) / (inputCount + 1)) * 100}%` }}
        />
      ))}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-gray-600" />
          <div>
            <div className="font-bold text-sm">{data.label || "Merge"}</div>
            <div className="text-xs text-muted-foreground">
              {modeLabels[data.config?.mode || "append"] || "Append"}
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
              title="Configure"
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

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-500"
      />

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Merge Error
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Node:</h4>
                <p className="text-sm text-muted-foreground">{data.label || "Merge"}</p>
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

MergeNode.displayName = "MergeNode";
