"use client";

import { cn } from "@/lib/utils";

interface BreakpointIndicatorProps {
  nodeId: string;
  hasBreakpoint: boolean;
  isActive?: boolean;
  onToggle: (nodeId: string) => void;
  className?: string;
}

export function BreakpointIndicator({
  nodeId,
  hasBreakpoint,
  isActive = false,
  onToggle,
  className,
}: BreakpointIndicatorProps) {
  return (
    <button
      className={cn(
        "absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full",
        "transition-all duration-200 ease-in-out",
        "hover:scale-150 hover:shadow-lg",
        "focus:outline-none focus:ring-1 focus:ring-red-400 focus:ring-offset-1",
        "border",
        hasBreakpoint
          ? "bg-red-500 border-red-600 shadow-md shadow-red-500/50 hover:bg-red-600 hover:shadow-red-600/50"
          : "bg-gray-300/60 dark:bg-gray-600/60 border-gray-400/60 dark:border-gray-500/60 hover:bg-red-400 hover:border-red-500 hover:shadow-red-400/50",
        isActive && "ring-2 ring-yellow-400 ring-offset-1 animate-pulse shadow-lg shadow-yellow-400/50",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(nodeId);
      }}
      title={hasBreakpoint ? "Remove breakpoint (F9)" : "Add breakpoint (F9)"}
    />
  );
}
