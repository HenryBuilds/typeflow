"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  StepForward,
  FastForward,
  Square,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DebugToolbarProps {
  isDebugging: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  onStartDebug: () => void;
  onStepOver: () => void;
  onContinue: () => void;
  onStop: () => void;
  isStarting?: boolean;
  isStepping?: boolean;
  isContinuing?: boolean;
  isStopping?: boolean;
  disabled?: boolean;
}

export function DebugToolbar({
  isDebugging,
  isPaused,
  currentNodeId,
  onStartDebug,
  onStepOver,
  onContinue,
  onStop,
  isStarting = false,
  isStepping = false,
  isContinuing = false,
  isStopping = false,
  disabled = false,
}: DebugToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-1 mr-2">
        <Bug className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Debug</span>
      </div>

      {!isDebugging ? (
        <Button
          size="sm"
          variant="default"
          onClick={onStartDebug}
          disabled={disabled || isStarting}
          className="gap-1"
        >
          <Play className="h-3 w-3" />
          {isStarting ? "Starting..." : "Start Debug"}
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={onStepOver}
            disabled={!isPaused || isStepping || disabled}
            className="gap-1"
            title="Step Over (F10)"
          >
            <StepForward className="h-3 w-3" />
            {isStepping ? "..." : "Step"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onContinue}
            disabled={!isPaused || isContinuing || disabled}
            className="gap-1"
            title="Continue (F5)"
          >
            <FastForward className="h-3 w-3" />
            {isContinuing ? "..." : "Continue"}
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            disabled={isStopping || disabled}
            className="gap-1"
            title="Stop (Shift+F5)"
          >
            <Square className="h-3 w-3" />
            {isStopping ? "..." : "Stop"}
          </Button>
        </>
      )}

      {isDebugging && (
        <div className="flex items-center gap-2 ml-4">
          <Badge
            variant={isPaused ? "default" : "secondary"}
            className={cn(
              "text-xs",
              isPaused && "bg-yellow-500 hover:bg-yellow-600"
            )}
          >
            {isPaused ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Paused
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1 animate-pulse" />
                Running
              </>
            )}
          </Badge>

          {currentNodeId && isPaused && (
            <span className="text-xs text-muted-foreground">
              at node: <code className="bg-muted px-1 rounded">{currentNodeId.slice(0, 8)}...</code>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
