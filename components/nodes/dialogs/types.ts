"use client";

/**
 * Shared types for node dialogs
 */

/**
 * Represents input data from a source node, used for variable suggestions
 */
export interface InputDataItem {
  sourceNodeId: string;
  output: unknown;
  sourceNodeLabel?: string;
}

/**
 * Common props for dialogs that support variable expressions
 */
export interface ExpressionDialogProps {
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
}
