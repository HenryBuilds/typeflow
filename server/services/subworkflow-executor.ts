/**
 * Subworkflow Executor
 * Handles execution of Execute Workflow nodes (subworkflows)
 */

import { nodes } from "@/db/schema";
import type { ExecutionItem, WorkflowExecutionResult } from "@/types/execution";

/**
 * Execute a subworkflow node
 * Note: This function requires a callback to the main executeWorkflow function
 * to avoid circular dependencies
 */
export async function executeSubworkflow(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[],
  organizationId: string,
  executeWorkflowFn: (
    workflowId: string,
    organizationId: string,
    triggerData?: Record<string, unknown>
  ) => Promise<WorkflowExecutionResult>
): Promise<ExecutionItem[]> {
  const config = node.config as {
    workflowId?: string;
    workflowName?: string;
    mode?: "once" | "foreach";
  };

  if (!config?.workflowId) {
    throw new Error("No workflow configured for Execute Workflow node");
  }

  const subworkflowId = config.workflowId;
  const mode = config.mode || "once";

  try {
    if (mode === "once") {
      // Execute the subworkflow once with all input items
      const triggerData = {
        items: inputItems,
        json: inputItems.length > 0 ? inputItems[0].json : {},
      };

      const result = await executeWorkflowFn(
        subworkflowId,
        organizationId,
        triggerData
      );

      if (!result.success) {
        throw new Error(`Subworkflow failed: ${result.error || "Unknown error"}`);
      }

      // Return the final output from the subworkflow
      return result.finalOutput || [{ json: { success: true } }];
    } else {
      // Execute the subworkflow for each input item
      const allOutputs: ExecutionItem[] = [];

      for (let i = 0; i < inputItems.length; i++) {
        const item = inputItems[i];
        const triggerData = {
          item: item.json,
          index: i,
          json: item.json,
        };

        const result = await executeWorkflowFn(
          subworkflowId,
          organizationId,
          triggerData
        );

        if (!result.success) {
          throw new Error(
            `Subworkflow failed for item ${i + 1}: ${result.error || "Unknown error"}`
          );
        }

        // Collect outputs from each execution
        if (result.finalOutput) {
          allOutputs.push(...result.finalOutput);
        } else {
          allOutputs.push({ json: { success: true, itemIndex: i } });
        }
      }

      return allOutputs;
    }
  } catch (error) {
    throw new Error(
      `Subworkflow execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
