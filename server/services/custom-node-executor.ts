/**
 * Custom Node Executor
 * Handles execution of user-defined custom nodes
 */

import * as ts from "typescript";
import { db } from "@/db/db";
import { nodes, customNodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { credentialService } from "./credential-service";
import { createLogger } from "@/lib/logger";
import type { ExecutionItem } from "@/types/execution";

const log = createLogger('CustomNodeExecutor');

/**
 * Execute a custom node (user-defined node type)
 */
export async function executeCustomNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[],
  organizationId: string
): Promise<ExecutionItem[]> {
  // Extract the actual custom node type name (remove "custom_" prefix)
  const customNodeTypeName = node.type.replace("custom_", "");

  // Load the custom node definition from database
  const allCustomNodes = await db.query.customNodes.findMany({
    where: eq(customNodes.organizationId, organizationId),
  });

  const customNodeDef = allCustomNodes.find(cn => {
    const desc = cn.description as { name: string };
    return desc.name === customNodeTypeName;
  });

  if (!customNodeDef) {
    throw new Error(`Custom node type '${customNodeTypeName}' not found`);
  }

  const description = customNodeDef.description as {
    properties?: Array<{ name: string; default?: unknown }>;
    credentials?: Array<{ name: string; required: boolean }>;
  };
  const executeCode = customNodeDef.executeCode;

  if (!executeCode || executeCode.trim() === "") {
    // No code - pass through
    return inputItems;
  }

  // Build node config with defaults
  const nodeConfig = node.config as Record<string, unknown> || {};
  const config: Record<string, unknown> = {};
  
  // Apply defaults from description, then override with node config
  for (const prop of description.properties || []) {
    config[prop.name] = nodeConfig[prop.name] !== undefined 
      ? nodeConfig[prop.name] 
      : prop.default;
  }

  // Get credentials if required
  let credentials: Record<string, unknown> = {};
  if (description.credentials && description.credentials.length > 0) {
    try {
      credentials = await credentialService.getCredentials(organizationId) as Record<string, unknown>;
    } catch (error) {
      log.warn({ err: error }, 'Failed to load credentials for custom node');
    }
  }

  // Create typeflow-style execution context
  const $input = {
    all: () => inputItems,
    first: () => inputItems[0] || { json: {} },
    last: () => inputItems[inputItems.length - 1] || { json: {} },
    item: (index: number) => inputItems[index] || { json: {} },
  };

  const getNodeParameter = (name: string, itemIndex: number = 0) => {
    return config[name];
  };

  const getCredentials = (name: string) => {
    return credentials[name] || {};
  };

  // Compile TypeScript to JavaScript
  const tsResult = ts.transpileModule(executeCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      strict: false,
      esModuleInterop: true,
    },
  });

  const jsCode = tsResult.outputText;

  // Create sandbox and execute
  const vm = require("vm");
  const sandbox = {
    $input,
    $item: (index: number) => inputItems[index] || { json: {} },
    getNodeParameter,
    getCredentials,
    console: {
      log: (...args: unknown[]) => log.debug({ args }, 'CustomNode console.log'),
      error: (...args: unknown[]) => log.error({ args }, 'CustomNode console.error'),
      warn: (...args: unknown[]) => log.warn({ args }, 'CustomNode console.warn'),
    },
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    RegExp,
    Error,
    Promise,
    setTimeout,
    // Allow fetch for HTTP requests
    fetch: globalThis.fetch,
  };

  const context = vm.createContext(sandbox);
  
  // Wrap code to capture return value
  const wrappedCode = `
    (async () => {
      ${jsCode}
    })()
  `;

  try {
    const result = await vm.runInContext(wrappedCode, context, {
      timeout: 30000, // 30 second timeout
    });

    // Normalize result to ExecutionItem[]
    if (Array.isArray(result)) {
      // Check if already in correct format
      if (result.length === 0) {
        return [{ json: {} }];
      }
      if (result[0] && typeof result[0] === "object" && "json" in result[0]) {
        return result as ExecutionItem[];
      }
      // Wrap each item
      return result.map(item => ({ json: item }));
    } else if (result && typeof result === "object") {
      return [{ json: result }];
    } else {
      return inputItems;
    }
  } catch (error: any) {
    throw new Error(`Custom node execution failed: ${error.message}`);
  }
}
