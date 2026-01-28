import { trpc } from "@/lib/trpc";

export function useRunWorkflow() {
  return trpc.executions.run.useMutation();
}

export function useRunWorkflowUntilNode() {
  return trpc.executions.runUntilNode.useMutation();
}
