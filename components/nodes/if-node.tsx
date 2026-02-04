"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GitBranch, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, Settings2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NodeWrapper } from "./node-wrapper";

interface Branch {
  id: string;
  name: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  combineWith?: "and" | "or";
}

interface IfNodeData {
  label?: string;
  config?: {
    // Legacy format
    conditions?: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
    combineWith?: "and" | "or";
    // New format
    branches?: Branch[];
    elseEnabled?: boolean;
  };
  onEdit?: (nodeId: string) => void;
  onExecute?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  isExecuting?: boolean;
  executionStatus?: "pending" | "running" | "completed" | "failed";
  errorMessage?: string;
  // Debug props
  hasBreakpoint?: boolean;
  isBreakpointActive?: boolean;
  onToggleBreakpoint?: (nodeId: string) => void;
}

export const IfNode = memo(({ data, selected, id }: NodeProps<IfNodeData>) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);

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

  // Get branches from config (handle both legacy and new format)
  const branches = data.config?.branches || [];
  const elseEnabled = data.config?.elseEnabled !== false;
  
  // Check if using legacy format (no branches but has conditions)
  const isLegacy = branches.length === 0 && data.config?.conditions;
  
  // Calculate total outputs
  const totalOutputs = isLegacy 
    ? 2 // Legacy: true/false
    : branches.length + (elseEnabled ? 1 : 0);

  // Get description text
  const getDescription = () => {
    if (isLegacy) {
      const conditionCount = data.config?.conditions?.length || 0;
      const combineWith = data.config?.combineWith || "and";
      if (conditionCount > 0) {
        return `${conditionCount} condition${conditionCount > 1 ? `s (${combineWith.toUpperCase()})` : ''}`;
      }
      return 'No conditions';
    }
    
    const branchCount = branches.length;
    if (branchCount === 0) {
      return 'No branches';
    }
    return `${branchCount} branch${branchCount > 1 ? 'es' : ''}${elseEnabled ? ' + else' : ''}`;
  };

  // Get branch label for display
  const getBranchLabel = (index: number) => {
    if (index === 0) return "if";
    return `elif ${index}`;
  };

  return (
    <NodeWrapper
      nodeId={id}
      hasBreakpoint={data.hasBreakpoint}
      isBreakpointActive={data.isBreakpointActive}
      onToggleBreakpoint={data.onToggleBreakpoint}
    >
      <div
        className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 min-w-[160px] cursor-pointer ${getStatusStyles()}`}
        onDoubleClick={handleDoubleClick}
        title="Double-click to configure"
      >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-500"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-gray-600" />
          <div>
            <div className="font-bold text-sm">{data.label || "IF"}</div>
            <div className="text-xs text-muted-foreground">
              {getDescription()}
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
              title="Configure IF"
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

      {/* Output handles */}
      {isLegacy ? (
        <>
          {/* Legacy: True/False handles */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="w-3 h-3 !bg-green-500 !left-[30%]"
            title="True"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-3 h-3 !bg-red-500 !left-[70%]"
            title="False"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
            <span className="text-green-600">true</span>
            <span className="text-red-600">false</span>
          </div>
        </>
      ) : (
        <>
          {/* New format: Dynamic branch handles */}
          {branches.map((branch, index) => {
            const position = ((index + 1) / (totalOutputs + 1)) * 100;
            return (
              <Handle
                key={branch.id}
                type="source"
                position={Position.Bottom}
                id={branch.id}
                className="w-3 h-3 !bg-blue-500"
                style={{ left: `${position}%` }}
                title={getBranchLabel(index)}
              />
            );
          })}
          {elseEnabled && (
            <Handle
              type="source"
              position={Position.Bottom}
              id="else"
              className="w-3 h-3 !bg-gray-500"
              style={{ left: `${(totalOutputs / (totalOutputs + 1)) * 100}%` }}
              title="else"
            />
          )}
          {/* Labels */}
          {totalOutputs > 0 && (
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-0.5 gap-1">
              {branches.map((branch, index) => (
                <span key={branch.id} className="truncate max-w-[40px] text-blue-600" title={getBranchLabel(index)}>
                  {getBranchLabel(index)}
                </span>
              ))}
              {elseEnabled && (
                <span className="text-gray-500">else</span>
              )}
            </div>
          )}
        </>
      )}

      {/* Error Details Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              IF Node Error
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Node:</h4>
                <p className="text-sm text-muted-foreground">{data.label || "IF"}</p>
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

IfNode.displayName = "IfNode";
