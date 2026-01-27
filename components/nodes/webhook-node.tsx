"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Webhook, Play, CheckCircle2, XCircle, Loader2, Trash2, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NodeWrapper } from "./node-wrapper";

interface WebhookNodeData {
  label?: string;
  config?: {
    path?: string;
    method?: string;
    webhookId?: string;
    [key: string]: unknown;
  };
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  isExecuting?: boolean;
  executionStatus?: "pending" | "running" | "completed" | "failed";
  errorMessage?: string;
  webhookUrl?: string; // Full URL to the webhook endpoint (only set when workflow is active)
  isWorkflowActive?: boolean; // Whether the workflow is currently active
  // Debug props
  hasBreakpoint?: boolean;
  isBreakpointActive?: boolean;
  onToggleBreakpoint?: (nodeId: string) => void;
}

export const WebhookNode = memo(({ data, selected, id }: NodeProps<WebhookNodeData>) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  
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

  const handleCopyUrl = async () => {
    if (data.webhookUrl) {
      await navigator.clipboard.writeText(data.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDoubleClick = () => {
    if (data.onEdit) {
      data.onEdit(id);
    }
  };

  return (
    <NodeWrapper
      nodeId={id}
      hasBreakpoint={data.hasBreakpoint}
      isBreakpointActive={data.isBreakpointActive}
      onToggleBreakpoint={data.onToggleBreakpoint}
    >
      <div
        className={`px-4 py-2 shadow-md rounded-md border-2 cursor-pointer transition-all duration-200 ${getStatusStyles()}`}
        onDoubleClick={handleDoubleClick}
        title="Double-click to configure webhook"
      >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-purple-500" />
          <div className="font-bold text-sm">{data.label || "Webhook"}</div>
          {getStatusIcon()}
        </div>
        <div className="flex items-center gap-1">
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
      
      {data.config?.path && (
        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
          <span className="font-mono">{data.config.method || "POST"}</span>
          <span>/webhook/{data.config.path}</span>
        </div>
      )}

      {/* Show inactive status when workflow is not active */}
      {data.config?.path && !data.isWorkflowActive && (
        <div className="mt-1">
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-700">
            Inactive - Activate workflow to enable
          </Badge>
        </div>
      )}

      {data.webhookUrl && (
        <div className="mt-1 flex items-center gap-1 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyUrl();
            }}
            title="Copy webhook URL"
          >
            <Copy className="h-3 w-3 mr-1" />
            {copied ? "Copied!" : "Copy URL"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              window.open(data.webhookUrl, "_blank");
            }}
            title="Open webhook URL"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      )}
      
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
                <p className="text-sm text-muted-foreground">{data.label || "Webhook"}</p>
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

WebhookNode.displayName = "WebhookNode";
