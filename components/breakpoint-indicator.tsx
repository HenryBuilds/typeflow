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
        "absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full",
        "transition-all duration-150 hover:scale-125",
        "focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1",
        hasBreakpoint
          ? "bg-red-500 hover:bg-red-600"
          : "bg-transparent hover:bg-red-300 border-2 border-transparent hover:border-red-400",
        isActive && "ring-2 ring-yellow-400 ring-offset-1 animate-pulse",
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
