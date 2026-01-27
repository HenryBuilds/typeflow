"use client";

import { ReactNode } from "react";
import { BreakpointIndicator } from "../breakpoint-indicator";

interface NodeWrapperProps {
  nodeId: string;
  children: ReactNode;
  hasBreakpoint?: boolean;
  isBreakpointActive?: boolean;
  onToggleBreakpoint?: (nodeId: string) => void;
  className?: string;
}

/**
 * Wrapper component that adds breakpoint indicator to any node
 */
export function NodeWrapper({
  nodeId,
  children,
  hasBreakpoint = false,
  isBreakpointActive = false,
  onToggleBreakpoint,
  className = "",
}: NodeWrapperProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Breakpoint Indicator */}
      {onToggleBreakpoint && (
        <BreakpointIndicator
          nodeId={nodeId}
          hasBreakpoint={hasBreakpoint}
          isActive={isBreakpointActive}
          onToggle={onToggleBreakpoint}
        />
      )}
      
      {/* Node Content */}
      {children}
    </div>
  );
}
