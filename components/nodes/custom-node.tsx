"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Button } from "@/components/ui/button";
import {
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  AlertCircle,
  Puzzle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BreakpointIndicator } from "@/components/breakpoint-indicator";
import type { INodeTypeDescription } from "@/db/schema/custom-nodes";

interface CustomNodeData {
  label?: string;
  nodeTypeDescription?: INodeTypeDescription;
  config?: Record<string, unknown>;
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

export const CustomNode = memo(({ data, selected, id }: NodeProps<CustomNodeData>) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  
  const description = data.nodeTypeDescription;
  const displayName = description?.displayName || data.label || "Custom Node";
  // Check both iconColor (typeflow convention) and color, with a default grey if neither is set
  const color = (description as any)?.iconColor || description?.color || "#6b7280";
  const iconName = description?.icon;

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

  // Render custom icon or default Puzzle icon
  const renderIcon = () => {
    return (
      <div 
        className="h-4 w-4 rounded flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Puzzle className="h-3 w-3" style={{ color }} />
      </div>
    );
  };

  return (
    <div
      className={`px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all duration-300 relative ${getStatusStyles()}`}
      onDoubleClick={handleDoubleClick}
      title={`Double-click to configure ${displayName}`}
      style={{ borderLeftColor: color, borderLeftWidth: "4px" }}
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
          {renderIcon()}
          <div className="font-bold text-sm">{displayName}</div>
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

      {/* Show node description if available */}
      {description?.description && (
        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]">
          {description.description}
        </div>
      )}

      {/* Show configured properties preview */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]">
          {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
            <span key={key} className="mr-2">
              {key}: {String(value).substring(0, 10)}
            </span>
          ))}
        </div>
      )}

      {/* Input handle - show by default if no description or if inputs includes 'main' */}
      {(!description?.inputs || description.inputs.includes("main")) && (
        <Handle
          type="target"
          position={Position.Top}
          id="main-input"
          className="w-3 h-3 !bg-blue-500"
        />
      )}
      
      {/* Output handle - show by default if no description or if outputs includes 'main' */}
      {(!description?.outputs || description.outputs.includes("main")) && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="main-output"
          className="w-3 h-3 !bg-green-500"
        />
      )}

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
                <p className="text-sm text-muted-foreground">{displayName}</p>
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

CustomNode.displayName = "CustomNode";
