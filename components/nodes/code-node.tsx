"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Code, ChevronDown, Play, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

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
}

export const CodeNode = memo(({ data, selected, id }: NodeProps<CodeNodeData>) => {
  const [showInput, setShowInput] = useState(false);
  
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
      className={`px-4 py-2 shadow-md rounded-md border-2 cursor-pointer transition-all duration-200 ${getStatusStyles()}`}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit code"
    >
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
    </div>
  );
});

CodeNode.displayName = "CodeNode";

