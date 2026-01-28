"use client";

import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import type {
  DebugSession,
  DebugState,
  DebugStackFrame,
  NodeExecutionResult,
  ExecutionItem,

} from "@/types/debugger";

// Helper to parse session from API (dates match string in JSON)
function parseSession(session: any): DebugSession {
  if (!session) return session;
  return {
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
  } as DebugSession;
}

export function useDebug(workflowId: string, organizationId: string) {
  const [debugState, setDebugState] = useState<DebugState>({
    session: null,
    isDebugging: false,
    isPaused: false,
    currentNodeId: null,
    executedNodeIds: [],
  });
  const [breakpoints, setBreakpoints] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  // Queries
  const { data: savedBreakpoints } = trpc.debug.getBreakpoints.useQuery(
    { organizationId, workflowId },
    { enabled: !!workflowId && !!organizationId }
  );

  // Mutations
  const createSessionMutation = trpc.debug.createSession.useMutation();
  const startMutation = trpc.debug.start.useMutation();
  const stepOverMutation = trpc.debug.stepOver.useMutation();
  const continueMutation = trpc.debug.continue.useMutation();
  const terminateMutation = trpc.debug.terminate.useMutation();
  const toggleBreakpointMutation = trpc.debug.toggleBreakpoint.useMutation();

  // Load saved breakpoints
  useEffect(() => {
    if (savedBreakpoints) {
      setBreakpoints(new Set(savedBreakpoints));
    }
  }, [savedBreakpoints]);

  // Update debug state from session
  const updateStateFromSession = useCallback(
    (session: DebugSession, result?: { isPaused: boolean; callStack?: DebugStackFrame[] }) => {
      const executedNodeIds = Object.keys(session.nodeResults || {}).filter(
        (id) => (session.nodeResults as Record<string, NodeExecutionResult>)?.[id]?.status === "completed"
      );

      setDebugState({
        session,
        isDebugging: session.status === "active" || session.status === "paused",
        isPaused: session.status === "paused",
        currentNodeId: session.currentNodeId || null,
        executedNodeIds,
      });
    },
    []
  );

  // Start debugging
  const startDebug = useCallback(
    async (triggerData?: Record<string, unknown>) => {
      try {
        // Create session
        const session = await createSessionMutation.mutateAsync({
          organizationId,
          workflowId,
          breakpoints: Array.from(breakpoints),
          triggerData,
        });

        // Start execution
        const { session: updatedSession, result } = await startMutation.mutateAsync({
          organizationId,
          sessionId: session.id,
        });

        updateStateFromSession(parseSession(updatedSession), {
          isPaused: result.isPaused,
          callStack: result.callStack || undefined,
        });

        return updatedSession;
      } catch (error) {
        console.error("Failed to start debug session:", error);
        throw error;
      }
    },
    [organizationId, workflowId, breakpoints, createSessionMutation, startMutation, updateStateFromSession]
  );

  // Step over - execute one node
  const stepOver = useCallback(async () => {
    if (!debugState.session?.id) return;

    try {
      const { session, result } = await stepOverMutation.mutateAsync({
        organizationId,
        sessionId: debugState.session.id,
      });

      updateStateFromSession(parseSession(session), {
        isPaused: result.isPaused,
        callStack: result.callStack || undefined,
      });
    } catch (error) {
      console.error("Failed to step over:", error);
      throw error;
    }
  }, [organizationId, debugState.session?.id, stepOverMutation, updateStateFromSession]);

  // Continue to next breakpoint
  const continueExecution = useCallback(async () => {
    if (!debugState.session?.id) return;

    try {
      const { session, result } = await continueMutation.mutateAsync({
        organizationId,
        sessionId: debugState.session.id,
      });

      updateStateFromSession(parseSession(session), {
        isPaused: result.isPaused,
        callStack: result.callStack || undefined,
      });
    } catch (error) {
      console.error("Failed to continue:", error);
      throw error;
    }
  }, [organizationId, debugState.session?.id, continueMutation, updateStateFromSession]);

  // Stop debugging
  const stopDebug = useCallback(async () => {
    if (!debugState.session?.id) return;

    try {
      await terminateMutation.mutateAsync({
        organizationId,
        sessionId: debugState.session.id,
      });

      setDebugState({
        session: null,
        isDebugging: false,
        isPaused: false,
        currentNodeId: null,
        executedNodeIds: [],
      });
    } catch (error) {
      console.error("Failed to stop debug session:", error);
      throw error;
    }
  }, [organizationId, debugState.session?.id, terminateMutation]);

  // Toggle breakpoint on a node
  const toggleBreakpoint = useCallback(
    async (nodeId: string) => {
      const newBreakpoints = new Set(breakpoints);
      const enabled = !newBreakpoints.has(nodeId);

      if (enabled) {
        newBreakpoints.add(nodeId);
      } else {
        newBreakpoints.delete(nodeId);
      }

      setBreakpoints(newBreakpoints);

      try {
        await toggleBreakpointMutation.mutateAsync({
          organizationId,
          workflowId,
          nodeId,
          enabled,
        });

        // Invalidate breakpoints query
        await utils.debug.getBreakpoints.invalidate({ organizationId, workflowId });
      } catch (error) {
        // Revert on error
        if (enabled) {
          newBreakpoints.delete(nodeId);
        } else {
          newBreakpoints.add(nodeId);
        }
        setBreakpoints(newBreakpoints);
        console.error("Failed to toggle breakpoint:", error);
        throw error;
      }
    },
    [organizationId, workflowId, breakpoints, toggleBreakpointMutation, utils]
  );

  // Get node results for display
  const getNodeResult = useCallback(
    (nodeId: string): NodeExecutionResult | undefined => {
      return (debugState.session?.nodeResults as Record<string, NodeExecutionResult>)?.[nodeId];
    },
    [debugState.session?.nodeResults]
  );

  // Get node output for display
  const getNodeOutput = useCallback(
    (nodeId: string): ExecutionItem[] | undefined => {
      return (debugState.session?.nodeOutputs as Record<string, ExecutionItem[]>)?.[nodeId];
    },
    [debugState.session?.nodeOutputs]
  );

  // Get call stack
  const getCallStack = useCallback((): DebugStackFrame[] => {
    return (debugState.session?.callStack as DebugStackFrame[]) || [];
  }, [debugState.session?.callStack]);

  return {
    // State
    debugState,
    breakpoints,
    isDebugging: debugState.isDebugging,
    isPaused: debugState.isPaused,
    currentNodeId: debugState.currentNodeId,
    executedNodeIds: debugState.executedNodeIds,

    // Actions
    startDebug,
    stepOver,
    continueExecution,
    stopDebug,
    toggleBreakpoint,

    // Helpers
    getNodeResult,
    getNodeOutput,
    getCallStack,

    // Loading states
    isStarting: createSessionMutation.isPending || startMutation.isPending,
    isStepping: stepOverMutation.isPending,
    isContinuing: continueMutation.isPending,
    isStopping: terminateMutation.isPending,
  };
}
