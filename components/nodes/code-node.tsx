"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Code, ChevronDown, Play, CheckCircle2, XCircle, Loader2, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BreakpointIndicator } from "@/components/breakpoint-indicator";

interface CodeNodeData {
  label?: string;
  config?: {
    code?: string;
    [key: string]: unknown;
  };
  onEdit?: (nodeId: string) => void;
  onExecute?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  isExecuting?: boolean;
  executionStatus?: "pending" | "running" | "completed" | "failed";
  errorMessage?: string;
  inputData?: Array<{
    sourceNodeId: string;
    output: unknown;
  }>;
  hasBreakpoint?: boolean;
  isBreakpointActive?: boolean;
  onToggleBreakpoint?: (nodeId: string) => void;
}

export const CodeNode = memo(({ data, selected, id }: NodeProps<CodeNodeData>) => {
  const [showInput, setShowInput] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  
  const handleDoubleClick = () => {
    if (data.onEdit) {
      data.onEdit(id);
    }
  };

  const formatOutput = (output: unknown): string => {
    if (output === null) return "null";
    if (output === undefined) return "undefined";
    
    // Handle items array format
    if (Array.isArray(output) && output.length > 0 && output[0]?.json !== undefined) {
      const items = output as Array<{ json: unknown }>;
      if (items.length === 1) {
        return JSON.stringify(items[0].json, null, 2);
      } else {
        return JSON.stringify(items.map(item => item.json), null, 2);
      }
    }
    
    try {
      const str = JSON.stringify(output, null, 2);
      return str.length > 200 ? str.substring(0, 200) + "..." : str;
    } catch {
      return String(output);
    }
  };

  const hasInput = data.inputData && data.inputData.length > 0;
  const firstInput = data.inputData?.[0]?.output;

  // Determine border and background color based on execution status
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

  return (
    <div
      className={`px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all duration-300 relative ${getStatusStyles()}`}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit code"
    >
      {/* Breakpoint Indicator */}
      {data.onToggleBreakpoint && (
        <BreakpointIndicator
          nodeId={id}
          hasBreakpoint={data.hasBreakpoint || false}
          isActive={data.isBreakpointActive || false}
          onToggle={data.onToggleBreakpoint}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4" />
          <div className="font-bold text-sm">{data.label || "Code Node"}</div>
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
      {data.config?.code && (
        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]">
          {String(data.config.code).substring(0, 30)}...
        </div>
      )}
      
      {/* Show input data from previous node */}
      {hasInput && (
        <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInput(!showInput);
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showInput ? 'rotate-180' : ''}`} />
            <span>Input from previous node</span>
          </button>
          {showInput && firstInput !== undefined && (
            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono max-h-32 overflow-auto">
              <pre className="whitespace-pre-wrap break-words">
                {formatOutput(firstInput)}
              </pre>
            </div>
          )}
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
      
      {/* Error Details Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Execution Error
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Node:</h4>
                <p className="text-sm text-muted-foreground">{data.label || "Code Node"}</p>
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
  );
});

CodeNode.displayName = "CodeNode";

