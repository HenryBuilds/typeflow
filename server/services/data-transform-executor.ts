/**
 * Data Transform Executor Module
 * Handles execution of data transformation nodes: Filter, Limit, RemoveDuplicates, 
 * SplitOut, Aggregate, Merge, Summarize, DateTime, EditFields
 */

import { nodes } from "@/db/schema";
import type { ExecutionItem } from "@/types/execution";

// Helper: Get nested value from object by dot-notation path
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Strip common prefixes like $json. since obj is already the json object
  let normalizedPath = path;
  if (normalizedPath.startsWith("$json.")) {
    normalizedPath = normalizedPath.slice(6); // Remove "$json."
  } else if (normalizedPath === "$json") {
    return obj; // Return the whole object
  }
  
  const keys = normalizedPath.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// Helper: Set nested value in object by dot-notation path
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current) || typeof current[keys[i]] !== "object") {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

// Helper: Delete nested value from object by dot-notation path
export function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) return;
    current = current[keys[i]] as Record<string, unknown>;
  }
  delete current[keys[keys.length - 1]];
}

// Helper: Evaluate a condition
export function evaluateCondition(fieldValue: unknown, operator: string, compareValue: string): boolean {
  const strFieldValue = String(fieldValue ?? "");
  const numFieldValue = Number(fieldValue);
  const numCompareValue = Number(compareValue);

  switch (operator) {
    case "equals":
    case "equal":
      return strFieldValue === compareValue;
    case "notEquals":
    case "notEqual":
      return strFieldValue !== compareValue;
    case "contains":
      return strFieldValue.includes(compareValue);
    case "notContains":
      return !strFieldValue.includes(compareValue);
    case "startsWith":
      return strFieldValue.startsWith(compareValue);
    case "endsWith":
      return strFieldValue.endsWith(compareValue);
    case "greaterThan":
      return numFieldValue > numCompareValue;
    case "lessThan":
      return numFieldValue < numCompareValue;
    case "greaterThanOrEqual":
      return numFieldValue >= numCompareValue;
    case "lessThanOrEqual":
      return numFieldValue <= numCompareValue;
    case "isEmpty":
      return fieldValue === null || fieldValue === undefined || strFieldValue === "";
    case "isNotEmpty":
      return fieldValue !== null && fieldValue !== undefined && strFieldValue !== "";
    case "isTrue":
      return fieldValue === true || strFieldValue === "true";
    case "isFalse":
      return fieldValue === false || strFieldValue === "false";
    case "regex":
      try {
        return new RegExp(compareValue).test(strFieldValue);
      } catch {
        return false;
      }
    default:
      return strFieldValue === compareValue;
  }
}

// Filter Node Execution
export function executeFilterNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    conditions?: Array<{ field: string; operator: string; value: string }>;
    combineWith?: "and" | "or";
  };

  if (!config?.conditions || config.conditions.length === 0) {
    return inputItems;
  }

  const combineWith = config.combineWith || "and";

  return inputItems.filter(item => {
    const results = config.conditions!.map(condition => {
      const fieldValue = getNestedValue(item.json, condition.field);
      return evaluateCondition(fieldValue, condition.operator, condition.value);
    });

    if (combineWith === "and") {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  });
}

// Limit Node Execution
export function executeLimitNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    maxItems?: number;
    keepFirst?: boolean;
  };

  const maxItems = config?.maxItems || 10;
  const keepFirst = config?.keepFirst !== false;

  if (keepFirst) {
    return inputItems.slice(0, maxItems);
  } else {
    return inputItems.slice(-maxItems);
  }
}

// Remove Duplicates Node Execution
export function executeRemoveDuplicatesNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    fieldToCompare?: string;
    compareAll?: boolean;
  };

  const seen = new Set<string>();
  const result: ExecutionItem[] = [];

  for (const item of inputItems) {
    let key: string;

    if (config?.compareAll || !config?.fieldToCompare) {
      key = JSON.stringify(item.json);
    } else {
      const value = getNestedValue(item.json, config.fieldToCompare);
      key = JSON.stringify(value);
    }

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

// Split Out Node Execution
export function executeSplitOutNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    fieldToSplit?: string;
    includeOtherFields?: boolean;
  };

  if (!config?.fieldToSplit) {
    return inputItems;
  }

  const result: ExecutionItem[] = [];

  for (const item of inputItems) {
    const arrayValue = getNestedValue(item.json, config.fieldToSplit);

    if (Array.isArray(arrayValue)) {
      for (const element of arrayValue) {
        if (config.includeOtherFields !== false) {
          result.push({
            json: {
              ...item.json,
              [config.fieldToSplit]: element,
            },
          });
        } else {
          result.push({
            json: typeof element === "object" && element !== null
              ? element as Record<string, unknown>
              : { value: element },
          });
        }
      }
    } else {
      result.push(item);
    }
  }

  return result;
}

// Aggregate Node Execution
export function executeAggregateNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    fieldToAggregate?: string;
    outputFieldName?: string;
  };

  const outputField = config?.outputFieldName || "data";

  if (config?.fieldToAggregate) {
    const values = inputItems.map(item =>
      getNestedValue(item.json, config.fieldToAggregate!)
    );
    return [{ json: { [outputField]: values } }];
  } else {
    const allData = inputItems.map(item => item.json);
    return [{ json: { [outputField]: allData } }];
  }
}

// Merge Node Execution
export function executeMergeNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    mode?: "append" | "combine" | "chooseBranch" | "multiplex";
    combineMode?: "mergeByPosition" | "mergeByKey" | "allCombinations";
    joinField?: string;
  };

  const mode = config?.mode || "append";

  switch (mode) {
    case "append":
      return inputItems;

    case "combine":
      if (config?.combineMode === "mergeByPosition") {
        const midpoint = Math.floor(inputItems.length / 2);
        const result: ExecutionItem[] = [];
        for (let i = 0; i < midpoint; i++) {
          result.push({
            json: {
              ...inputItems[i]?.json,
              ...inputItems[midpoint + i]?.json,
            },
          });
        }
        return result.length > 0 ? result : inputItems;
      } else if (config?.combineMode === "mergeByKey" && config?.joinField) {
        const keyMap = new Map<string, Record<string, unknown>>();
        for (const item of inputItems) {
          const keyValue = String(getNestedValue(item.json, config.joinField!) ?? "");
          const existing = keyMap.get(keyValue) || {};
          keyMap.set(keyValue, { ...existing, ...item.json });
        }
        return Array.from(keyMap.values()).map(json => ({ json }));
      }
      return inputItems;

    case "chooseBranch":
      return inputItems.length > 0 ? [inputItems[0]] : [];

    case "multiplex":
      return inputItems;

    default:
      return inputItems;
  }
}

// Summarize Node Execution
export function executeSummarizeNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    operations?: Array<{
      type: "sum" | "count" | "average" | "min" | "max" | "concat";
      field?: string;
      outputField?: string;
    }>;
    groupBy?: string;
  };

  if (!config?.operations || config.operations.length === 0) {
    return [{ json: { count: inputItems.length } }];
  }

  const result: Record<string, unknown> = {};

  for (const op of config.operations) {
    const outputField = op.outputField || op.type;
    const values = op.field
      ? inputItems.map(item => getNestedValue(item.json, op.field!))
      : inputItems.map(item => item.json);

    switch (op.type) {
      case "count":
        result[outputField] = inputItems.length;
        break;
      case "sum":
        result[outputField] = values.reduce((acc: number, v) => acc + (Number(v) || 0), 0);
        break;
      case "average":
        const sum = values.reduce((acc: number, v) => acc + (Number(v) || 0), 0);
        result[outputField] = inputItems.length > 0 ? sum / inputItems.length : 0;
        break;
      case "min":
        const numVals = values.filter(v => typeof v === "number") as number[];
        result[outputField] = numVals.length > 0 ? Math.min(...numVals) : null;
        break;
      case "max":
        const numVals2 = values.filter(v => typeof v === "number") as number[];
        result[outputField] = numVals2.length > 0 ? Math.max(...numVals2) : null;
        break;
      case "concat":
        result[outputField] = values.map(v => String(v ?? "")).join(", ");
        break;
    }
  }

  return [{ json: result }];
}

// DateTime helpers
function formatDate(date: Date, format: string): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return format
    .replace("YYYY", date.getFullYear().toString())
    .replace("MM", pad(date.getMonth() + 1))
    .replace("DD", pad(date.getDate()))
    .replace("HH", pad(date.getHours()))
    .replace("mm", pad(date.getMinutes()))
    .replace("ss", pad(date.getSeconds()));
}

function addToDate(date: Date, amount: number, unit: string): Date {
  const result = new Date(date);
  switch (unit) {
    case "seconds": result.setSeconds(result.getSeconds() + amount); break;
    case "minutes": result.setMinutes(result.getMinutes() + amount); break;
    case "hours": result.setHours(result.getHours() + amount); break;
    case "days": result.setDate(result.getDate() + amount); break;
    case "weeks": result.setDate(result.getDate() + amount * 7); break;
    case "months": result.setMonth(result.getMonth() + amount); break;
    case "years": result.setFullYear(result.getFullYear() + amount); break;
  }
  return result;
}

function extractFromDate(date: Date, part: string): number {
  switch (part) {
    case "year": return date.getFullYear();
    case "month": return date.getMonth() + 1;
    case "day": return date.getDate();
    case "hour": return date.getHours();
    case "minute": return date.getMinutes();
    case "second": return date.getSeconds();
    case "dayOfWeek": return date.getDay();
    default: return 0;
  }
}

// DateTime Node Execution
export function executeDateTimeNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    operation?: "format" | "add" | "subtract" | "difference" | "extract" | "now";
    inputField?: string;
    outputField?: string;
    format?: string;
    amount?: number;
    unit?: "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years";
    extractPart?: "year" | "month" | "day" | "hour" | "minute" | "second" | "dayOfWeek";
  };

  const operation = config?.operation || "now";
  const outputField = config?.outputField || "date";

  return inputItems.map(item => {
    let result: unknown;
    let inputDate: Date;

    if (config?.inputField) {
      const dateValue = getNestedValue(item.json, config.inputField);
      inputDate = dateValue ? new Date(dateValue as string | number) : new Date();
    } else {
      inputDate = new Date();
    }

    switch (operation) {
      case "now":
        result = new Date().toISOString();
        break;
      case "format":
        result = config?.format
          ? formatDate(inputDate, config.format)
          : inputDate.toISOString();
        break;
      case "add":
      case "subtract":
        const multiplier = operation === "subtract" ? -1 : 1;
        const amount = (config?.amount || 0) * multiplier;
        result = addToDate(inputDate, amount, config?.unit || "days").toISOString();
        break;
      case "extract":
        result = extractFromDate(inputDate, config?.extractPart || "year");
        break;
      default:
        result = inputDate.toISOString();
    }

    return {
      json: {
        ...item.json,
        [outputField]: result,
      },
    };
  });
}

// Edit Fields Node Execution
export function executeEditFieldsNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ExecutionItem[] {
  const config = node.config as {
    mode?: "manual" | "expression";
    fields?: Array<{ name: string; value: string; type?: string }>;
    removeFields?: string[];
    renameFields?: Array<{ from: string; to: string }>;
    keepOnlySet?: boolean;
  };

  return inputItems.map(item => {
    let newJson: Record<string, unknown> = config?.keepOnlySet
      ? {}
      : { ...item.json };

    // Set new fields
    if (config?.fields) {
      for (const field of config.fields) {
        let value: unknown = field.value;

        // Type conversion
        if (field.type === "number") {
          value = Number(field.value);
        } else if (field.type === "boolean") {
          value = field.value === "true";
        } else if (field.type === "object" || field.type === "array") {
          try {
            value = JSON.parse(field.value);
          } catch {
            value = field.value;
          }
        }

        setNestedValue(newJson, field.name, value);
      }
    }

    // Remove fields
    if (config?.removeFields) {
      for (const fieldPath of config.removeFields) {
        deleteNestedValue(newJson, fieldPath);
      }
    }

    // Rename fields
    if (config?.renameFields) {
      for (const rename of config.renameFields) {
        const value = getNestedValue(newJson, rename.from);
        if (value !== undefined) {
          deleteNestedValue(newJson, rename.from);
          setNestedValue(newJson, rename.to, value);
        }
      }
    }

    return { json: newJson };
  });
}

// Conditional execution result type - indicates which output handle to route data to
export interface ConditionalExecutionResult {
  // Map of outputHandle -> items to route to that handle
  outputs: Record<string, ExecutionItem[]>;
}

// IF Node Execution - routes items to matching branch outputs or else
export function executeIfNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ConditionalExecutionResult {
  const config = node.config as {
    // Legacy format
    conditions?: Array<{ field: string; operator: string; value: string }>;
    combineWith?: "and" | "or";
    // New format
    branches?: Array<{
      id: string;
      name: string;
      conditions: Array<{ field: string; operator: string; value: string }>;
      combineWith?: "and" | "or";
    }>;
    elseEnabled?: boolean;
  };

  // Handle legacy format (simple true/false)
  if (!config?.branches || config.branches.length === 0) {
    if (!config?.conditions || config.conditions.length === 0) {
      // No conditions - all items go to true
      return {
        outputs: {
          "true": inputItems,
          "false": [],
        },
      };
    }

    const combineWith = config.combineWith || "and";
    const trueItems: ExecutionItem[] = [];
    const falseItems: ExecutionItem[] = [];

    for (const item of inputItems) {
      const results = config.conditions.map(condition => {
        const fieldValue = getNestedValue(item.json, condition.field);
        return evaluateCondition(fieldValue, condition.operator, condition.value);
      });

      const matches = combineWith === "and" 
        ? results.every(r => r) 
        : results.some(r => r);

      if (matches) {
        trueItems.push(item);
      } else {
        falseItems.push(item);
      }
    }

    return {
      outputs: {
        "true": trueItems,
        "false": falseItems,
      },
    };
  }

  // New format with branches (if/else if/else)
  const branches = config.branches;
  const elseEnabled = config.elseEnabled !== false;

  // Initialize outputs for each branch
  const outputs: Record<string, ExecutionItem[]> = {};
  for (const branch of branches) {
    outputs[branch.id] = [];
  }
  if (elseEnabled) {
    outputs["else"] = [];
  }

  // Route each item to the first matching branch
  for (const item of inputItems) {
    let matched = false;

    for (const branch of branches) {
      if (branch.conditions.length === 0) continue;

      const combineWith = branch.combineWith || "and";
      const results = branch.conditions.map(condition => {
        const fieldValue = getNestedValue(item.json, condition.field);
        return evaluateCondition(fieldValue, condition.operator, condition.value);
      });

      const branchMatches = combineWith === "and" 
        ? results.every(r => r) 
        : results.some(r => r);

      if (branchMatches) {
        outputs[branch.id].push(item);
        matched = true;
        break; // Stop at first matching branch (like if/else if logic)
      }
    }

    // If no branch matched, go to else
    if (!matched && elseEnabled) {
      outputs["else"].push(item);
    }
  }

  return { outputs };
}

// Switch Node Execution - routes items to matching case outputs or fallback
export function executeSwitchNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): ConditionalExecutionResult {
  const config = node.config as {
    mode?: "rules" | "expression";
    cases?: Array<{
      id: string;
      name: string;
      conditions: Array<{ field: string; operator: string; value: string }>;
      combineWith: "and" | "or";
    }>;
    fallbackEnabled?: boolean;
  };

  const cases = config?.cases || [];
  const fallbackEnabled = config?.fallbackEnabled !== false;

  // Initialize outputs for each case
  const outputs: Record<string, ExecutionItem[]> = {};
  for (const caseItem of cases) {
    outputs[caseItem.id] = [];
  }
  if (fallbackEnabled) {
    outputs["fallback"] = [];
  }

  // Route each item to the first matching case
  for (const item of inputItems) {
    let matched = false;

    for (const caseItem of cases) {
      if (caseItem.conditions.length === 0) {
        continue;
      }

      const results = caseItem.conditions.map(condition => {
        const fieldValue = getNestedValue(item.json, condition.field);
        return evaluateCondition(fieldValue, condition.operator, condition.value);
      });

      const matches = caseItem.combineWith === "and" 
        ? results.every(r => r) 
        : results.some(r => r);

      if (matches) {
        outputs[caseItem.id].push(item);
        matched = true;
        break; // First match wins
      }
    }

    // If no case matched and fallback is enabled, route to fallback
    if (!matched && fallbackEnabled) {
      outputs["fallback"].push(item);
    }
  }

  return { outputs };
}

// Throw Error Node Execution - throws a user-defined error
export function executeThrowErrorNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): never {
  const config = node.config as {
    errorMessage?: string;
    errorType?: string;
  };

  const errorMessage = config?.errorMessage || "An error occurred";
  const errorType = config?.errorType || "Error";

  // Create a custom error with the configured message
  const error = new Error(`[${errorType}] ${errorMessage}`);
  error.name = errorType;
  
  throw error;
}
