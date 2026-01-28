"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock,
  Terminal,
  ChevronUp,
  ChevronDown,
  Trash2
} from "lucide-react";
import { useState } from "react";

export interface WorkflowLog {
  timestamp: Date;
  level: "info" | "success" | "error" | "warning";
  nodeId?: string;
  nodeLabel?: string;
  message: string;
}

interface WorkflowLogPanelProps {
  logs: WorkflowLog[];
  isExecuting: boolean;
  onClear?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  height?: number;
  onHeightChange?: (height: number) => void;
  isResizing?: boolean;
  onResizingChange?: (isResizing: boolean) => void;
}

export function WorkflowLogPanel({
  logs,
  isExecuting,
  onClear,
  isCollapsed = false,
  onToggleCollapse,
  height = 200,
  onHeightChange,
  isResizing = false,
  onResizingChange,
}: WorkflowLogPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(false); // Disabled by default to prevent unwanted scrolling

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const getLevelIcon = (level: WorkflowLog["level"]) => {
    switch (level) {
      case "success":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
      case "warning":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return <Terminal className="h-3 w-3 text-blue-500" />;
    }
  };

  const getLevelColor = (level: WorkflowLog["level"]) => {
    switch (level) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-foreground";
    }
  };

  if (isCollapsed) {
    return (
      <div className="border-t bg-background">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span className="text-sm font-semibold">Execution Logs</span>
            {isExecuting && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
            <Badge variant="outline" className="text-xs">
              {logs.length} {logs.length === 1 ? "entry" : "entries"}
            </Badge>
          </div>
          {onToggleCollapse && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              title="Expand logs"
            >
              <span className="text-xs text-muted-foreground mr-1">Expand</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`rounded-none border-0 border-t flex flex-col relative ${!isResizing ? 'transition-all duration-200' : ''}`} style={{ height: `${height}px` }}>
      {/* Resize Handle */}
      {onHeightChange && onResizingChange && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-primary/50 transition-colors z-20"
          onMouseDown={(e) => {
            e.preventDefault();
            onResizingChange(true);
            const startY = e.clientY;
            const startHeight = height;

            const handleMouseMove = (e: MouseEvent) => {
              const delta = startY - e.clientY;
              const newHeight = Math.max(100, Math.min(600, startHeight + delta));
              onHeightChange(newHeight);
            };

            const handleMouseUp = () => {
              onResizingChange(false);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}
      <CardHeader className="pb-2 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <CardTitle className="text-sm font-semibold">Execution Logs</CardTitle>
            {isExecuting && (
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
            )}
            <Badge variant="outline" className="text-xs">
              {logs.length} {logs.length === 1 ? "entry" : "entries"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-scroll
            </label>
            {onClear && logs.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2"
                onClick={onClear}
                title="Clear logs"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            {onToggleCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onToggleCollapse}
                title="Collapse logs"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0 bg-muted/10">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              {isExecuting ? "Executing workflow..." : "No logs yet"}
            </p>
          </div>
        ) : (
          <div className="font-mono text-xs">
            {logs.map((log, index) => (
              <div
                key={index}
                className="px-3 py-1.5 border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                  <div className="shrink-0 mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  {log.nodeLabel && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {log.nodeLabel}
                    </Badge>
                  )}
                  <span className={`${getLevelColor(log.level)} break-all`}>
                    {log.message}
                  </span>
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
