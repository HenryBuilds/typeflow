"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
  Webhook,
  Calendar,
  Timer,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ExecutionsPanelProps {
  workflowId: string;
  organizationId: string;
  selectedExecutionId?: string | null;
  onSelectExecution?: (executionId: string, nodeOutputs: Record<string, {
    status: "pending" | "running" | "completed" | "failed";
    output?: unknown;
    error?: string;
    duration?: number;
  }>) => void;
}

type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

interface NodeResult {
  status: "pending" | "running" | "completed" | "failed";
  output?: unknown;
  error?: string;
  duration?: number;
}

export function ExecutionsPanel({ workflowId, organizationId, selectedExecutionId, onSelectExecution }: ExecutionsPanelProps) {
  const [expandedExecutionId, setExpandedExecutionId] = useState<string | null>(null);
  const [limit] = useState(50);

  const {
    data: executions,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.executions.list.useQuery(
    { organizationId, workflowId, limit },
    { refetchInterval: 10000 } // Auto-refresh every 10 seconds
  );

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ExecutionStatus) => {
    const variants: Record<ExecutionStatus, string> = {
      completed: "bg-green-100 text-green-700 border-green-200",
      failed: "bg-red-100 text-red-700 border-red-200",
      running: "bg-blue-100 text-blue-700 border-blue-200",
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    };

    return (
      <Badge variant="outline" className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case "webhook":
        return <Webhook className="h-3 w-3" />;
      case "manual":
        return <Play className="h-3 w-3" />;
      case "cron":
        return <Calendar className="h-3 w-3" />;
      default:
        return <Play className="h-3 w-3" />;
    }
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const toggleExpanded = (id: string) => {
    setExpandedExecutionId(expandedExecutionId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Execution History</h2>
          <Badge variant="secondary" className="text-xs">
            {executions?.length || 0} executions
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Executions List */}
      <div className="flex-1 overflow-y-auto">
        {!executions || executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium mb-1">No executions yet</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Run your workflow or trigger it via webhook to see execution history here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className={`hover:bg-muted/30 transition-colors ${
                  selectedExecutionId === execution.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                }`}
              >
                {/* Execution Row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => {
                    toggleExpanded(execution.id);
                    // Also select this execution to show in the editor
                    if (onSelectExecution) {
                      const nodeResults = (execution.nodeResults || {}) as Record<string, {
                        status: "pending" | "running" | "completed" | "failed";
                        output?: unknown;
                        error?: string;
                        duration?: number;
                      }>;
                      
                      onSelectExecution(execution.id, nodeResults);
                    }
                  }}
                >
                  {/* Status Icon */}
                  {getStatusIcon(execution.status)}

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{execution.id.substring(0, 8)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {getTriggerIcon(execution.triggerType)}
                        {execution.triggerType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(execution.status)}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatDuration(execution.duration)}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp & Expand */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs text-muted-foreground text-right">
                      {execution.createdAt && (
                        <span title={new Date(execution.createdAt).toLocaleString()}>
                          {formatDistanceToNow(new Date(execution.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {expandedExecutionId === execution.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedExecutionId === execution.id && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-8 p-3 bg-muted/50 rounded-lg space-y-3">
                      {/* Error Message */}
                      {execution.error && (
                        <div className="p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded">
                          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                            Error
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                            {execution.error}
                          </p>
                        </div>
                      )}

                      {/* Node Results */}
                      {execution.nodeResults && Object.keys(execution.nodeResults).length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2">Node Results</p>
                          <div className="space-y-2">
                            {Object.entries(execution.nodeResults as Record<string, NodeResult>).map(
                              ([nodeId, result]) => (
                                <div
                                  key={nodeId}
                                  className="flex items-start gap-2 p-2 bg-background rounded border"
                                >
                                  {getStatusIcon(result.status)}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-mono truncate">
                                        {nodeId.substring(0, 8)}...
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDuration(result.duration)}
                                      </span>
                                    </div>
                                    {result.error && (
                                      <p className="text-xs text-red-500 mt-1 truncate">
                                        {result.error}
                                      </p>
                                    )}
                                    {result.output !== undefined && (
                                      <pre className="text-xs bg-muted p-1.5 rounded mt-1 overflow-x-auto max-h-24">
                                        {JSON.stringify(result.output, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Trigger Data */}
                      {execution.triggerData && Object.keys(execution.triggerData).length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2">Trigger Data</p>
                          <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-32">
                            {JSON.stringify(execution.triggerData, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Timing Info */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {execution.startedAt && (
                          <span>
                            Started: {new Date(execution.startedAt).toLocaleString()}
                          </span>
                        )}
                        {execution.completedAt && (
                          <span>
                            Completed: {new Date(execution.completedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
