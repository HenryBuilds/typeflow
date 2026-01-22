import { db } from "@/db/db";
import { workflows, nodes, connections, executions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as ts from "typescript";
import { packageManager } from "./package-manager";
import * as Module from "module";
import * as path from "path";

// Execution item structure
interface ExecutionItem {
  json: Record<string, unknown>;
  binary?: Record<string, unknown>;
  pairedItem?: {
    item: number;
  };
}

interface NodeExecutionResult {
  nodeId: string;
  status: "completed" | "failed";
  output?: ExecutionItem[]; // Array of execution items
  error?: string;
  duration: number;
}

interface WorkflowExecutionResult {
  success: boolean;
  nodeResults: Record<string, NodeExecutionResult>;
  finalOutput?: ExecutionItem[]; // Array of execution items
  error?: string;
}

export class WorkflowExecutor {
  async executeUntilNode(
    workflowId: string,
    organizationId: string,
    targetNodeId: string,
    triggerData?: Record<string, unknown>
  ): Promise<WorkflowExecutionResult> {
    // Get workflow with nodes and connections
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.organizationId, organizationId)
      ),
      with: {
        nodes: {
          orderBy: (nodes, { asc }) => [asc(nodes.executionOrder)],
        },
      },
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const workflowConnections = await db.query.connections.findMany({
      where: eq(connections.workflowId, workflowId),
    });

    // Extract type definitions from workflow metadata
    const typeDefinitions = (workflow.metadata as { typeDefinitions?: string } | null)?.typeDefinitions;

    // Build execution graph
    const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
    const nodeOutputs = new Map<string, ExecutionItem[]>();
    const nodeResults: Record<string, NodeExecutionResult> = {};

    // Find all predecessor nodes to the target node using BFS
    const predecessors = new Set<string>();
    const queue = [targetNodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      // Add current node as predecessor (except the target node itself)
      if (currentNodeId !== targetNodeId) {
        predecessors.add(currentNodeId);
      }

      // Find incoming connections
      const incomingConns = workflowConnections.filter(c => c.targetNodeId === currentNodeId);
      incomingConns.forEach(conn => {
        if (!visited.has(conn.sourceNodeId)) {
          queue.push(conn.sourceNodeId);
        }
      });
    }

    // Add target node to execution list
    predecessors.add(targetNodeId);

    // Find trigger or webhook node
    const triggerNode = workflow.nodes.find((n) => n.type === "trigger" || n.type === "webhook") || workflow.nodes[0];
    if (!triggerNode) {
      throw new Error("No trigger or webhook node found");
    }

    // Ensure trigger/webhook is in predecessors
    predecessors.add(triggerNode.id);

    // Execute nodes in topological order (BFS from trigger)
    const executedNodes = new Set<string>();
    const executionQueue: string[] = [triggerNode.id];

    while (executionQueue.length > 0) {
      const currentNodeId = executionQueue.shift()!;

      // Skip if already executed or not in predecessor list
      if (executedNodes.has(currentNodeId) || !predecessors.has(currentNodeId)) {
        continue;
      }

      const currentNode = nodeMap.get(currentNodeId);
      if (!currentNode) {
        continue;
      }

      // Check if all predecessors are executed
      const incomingConns = workflowConnections.filter(c => c.targetNodeId === currentNodeId);
      const allPredecessorsExecuted = incomingConns.every(conn => executedNodes.has(conn.sourceNodeId));
      
      if (incomingConns.length > 0 && !allPredecessorsExecuted) {
        // Re-queue this node for later
        executionQueue.push(currentNodeId);
        continue;
      }

      executedNodes.add(currentNodeId);
      const startTime = Date.now();

      try {
        let inputItems: ExecutionItem[] = [];

        if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          inputItems = triggerData ? [{ json: triggerData }] : [{ json: {} }];
        } else {
          const inputConnections = workflowConnections.filter(c => c.targetNodeId === currentNodeId);

          if (inputConnections.length > 0) {
            if (inputConnections.length === 1) {
              const sourceOutput = nodeOutputs.get(inputConnections[0].sourceNodeId);
              inputItems = sourceOutput || [{ json: {} }];
            } else {
              const allItems: ExecutionItem[] = [];
              for (const conn of inputConnections) {
                const sourceOutput = nodeOutputs.get(conn.sourceNodeId);
                if (sourceOutput) {
                  allItems.push(...sourceOutput);
                }
              }
              inputItems = allItems.length > 0 ? allItems : [{ json: {} }];
            }
          } else {
            inputItems = [{ json: {} }];
          }
        }

        console.log(`Executing node ${currentNodeId} (${currentNode.type}) with ${inputItems.length} input items`);

        let outputItems: ExecutionItem[] = [];

        if (currentNode.type === "code" || currentNode.type === "webhookResponse") {
          const predecessorOutputs = new Map<string, { nodeLabel: string; output: ExecutionItem[] }>();
          const visitedPredecessors = new Set<string>();
          const predecessorQueue = [currentNodeId];
          
          while (predecessorQueue.length > 0) {
            const nodeId = predecessorQueue.shift()!;
            if (visitedPredecessors.has(nodeId)) continue;
            visitedPredecessors.add(nodeId);
            
            const incomingConns = workflowConnections.filter(c => c.targetNodeId === nodeId);
            for (const conn of incomingConns) {
              const sourceNodeId = conn.sourceNodeId;
              if (!visitedPredecessors.has(sourceNodeId)) {
                const sourceOutput = nodeOutputs.get(sourceNodeId);
                const sourceNode = nodeMap.get(sourceNodeId);
                if (sourceOutput && sourceNode) {
                  predecessorOutputs.set(sourceNodeId, {
                    nodeLabel: sourceNode.label || `Node ${sourceNodeId.substring(0, 8)}`,
                    output: sourceOutput,
                  });
                }
                predecessorQueue.push(sourceNodeId);
              }
            }
          }
          
          outputItems = await this.executeCodeNode(currentNode, inputItems, predecessorOutputs, organizationId, typeDefinitions);
          console.log(`${currentNode.type === "webhookResponse" ? "Webhook Response" : "Code"} node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          outputItems = inputItems;
        } else {
          outputItems = inputItems;
        }

        const duration = Date.now() - startTime;
        console.log(`Node ${currentNodeId} execution completed:`, {
          inputItemsCount: inputItems.length,
          outputItemsCount: outputItems.length,
          firstOutputItem: outputItems[0],
        });

        nodeOutputs.set(currentNodeId, outputItems);
        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          status: "completed",
          output: outputItems,
          duration,
        };

        // Stop if we reached the target node
        if (currentNodeId === targetNodeId) {
          break;
        }

        // Add next nodes to queue (only if they're in predecessors)
        const outgoingConns = workflowConnections.filter(c => c.sourceNodeId === currentNodeId);
        outgoingConns.forEach(conn => {
          if (predecessors.has(conn.targetNodeId) && !executedNodes.has(conn.targetNodeId)) {
            executionQueue.push(conn.targetNodeId);
          }
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Node ${currentNodeId} execution failed:`, errorMessage);

        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          status: "failed",
          error: errorMessage,
          duration,
        };

        break;
      }
    }

    const finalNodeId = targetNodeId;
    const finalOutput = nodeOutputs.get(finalNodeId);

    return {
      success: Object.values(nodeResults).every(r => r.status === "completed"),
      nodeResults,
      finalOutput,
    };
  }

  async executeWorkflow(
    workflowId: string,
    organizationId: string,
    triggerData?: Record<string, unknown>
  ): Promise<WorkflowExecutionResult> {
    // Get workflow with nodes and connections
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.organizationId, organizationId)
      ),
      with: {
        nodes: {
          orderBy: (nodes, { asc }) => [asc(nodes.executionOrder)],
        },
      },
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const workflowConnections = await db.query.connections.findMany({
      where: eq(connections.workflowId, workflowId),
    });

    // Extract type definitions from workflow metadata
    const typeDefinitions = (workflow.metadata as { typeDefinitions?: string } | null)?.typeDefinitions;

    // Build execution graph
    const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
    const nodeOutputs = new Map<string, ExecutionItem[]>(); // Array of execution items per node
    const nodeResults: Record<string, NodeExecutionResult> = {};

    // Find trigger or webhook node (first node or node with type "trigger" or "webhook")
    const triggerNode =
      workflow.nodes.find((n) => n.type === "trigger" || n.type === "webhook") || workflow.nodes[0];

    if (!triggerNode) {
      throw new Error("No trigger or webhook node found");
    }

    // Execute nodes in order
    const executedNodes = new Set<string>();
    const executionQueue: string[] = [triggerNode.id];

    while (executionQueue.length > 0) {
      const currentNodeId = executionQueue.shift()!;

      if (executedNodes.has(currentNodeId)) {
        continue;
      }

      const currentNode = nodeMap.get(currentNodeId);
      if (!currentNode) {
        continue;
      }

      executedNodes.add(currentNodeId);
      const startTime = Date.now();

      try {
        // Start with items array
        let inputItems: ExecutionItem[] = [];

        // Convert trigger data to items format
        if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          inputItems = triggerData ? [{ json: triggerData }] : [{ json: {} }];
        } else {
          // Get input from connected nodes
          const inputConnections = workflowConnections.filter(
            (c) => c.targetNodeId === currentNodeId
          );

          if (inputConnections.length > 0) {
            // Single connection passes items directly
            if (inputConnections.length === 1) {
              const sourceOutput = nodeOutputs.get(
                inputConnections[0].sourceNodeId
              );
              inputItems = sourceOutput || [{ json: {} }];
            } else {
              // Multiple inputs - merge items from multiple sources
              const allItems: ExecutionItem[] = [];
              for (const conn of inputConnections) {
                const sourceOutput = nodeOutputs.get(conn.sourceNodeId);
                if (sourceOutput) {
                  allItems.push(...sourceOutput);
                }
              }
              inputItems = allItems.length > 0 ? allItems : [{ json: {} }];
            }
          } else {
            // No input connections - start with empty item
            inputItems = [{ json: {} }];
          }
        }

        console.log(
          `Executing node ${currentNodeId} (${currentNode.type}) with ${inputItems.length} input items`
        );

        let outputItems: ExecutionItem[] = [];

        // Execute node based on type
        if (currentNode.type === "code" || currentNode.type === "webhookResponse") {
          // Find all predecessor nodes and their outputs
          const predecessorOutputs = new Map<string, { nodeLabel: string; output: ExecutionItem[] }>();
          const visitedPredecessors = new Set<string>();
          const predecessorQueue = [currentNodeId];
          
          while (predecessorQueue.length > 0) {
            const nodeId = predecessorQueue.shift()!;
            if (visitedPredecessors.has(nodeId)) continue;
            visitedPredecessors.add(nodeId);
            
            // Find all nodes that connect to this node
            const incomingConns = workflowConnections.filter(c => c.targetNodeId === nodeId);
            for (const conn of incomingConns) {
              const sourceNodeId = conn.sourceNodeId;
              if (!visitedPredecessors.has(sourceNodeId)) {
                const sourceOutput = nodeOutputs.get(sourceNodeId);
                const sourceNode = nodeMap.get(sourceNodeId);
                if (sourceOutput && sourceNode) {
                  predecessorOutputs.set(sourceNodeId, {
                    nodeLabel: sourceNode.label || `Node ${sourceNodeId.substring(0, 8)}`,
                    output: sourceOutput,
                  });
                }
                predecessorQueue.push(sourceNodeId);
              }
            }
          }
          
          outputItems = await this.executeCodeNode(currentNode, inputItems, predecessorOutputs, organizationId, typeDefinitions);
          console.log(
            `${currentNode.type === "webhookResponse" ? "Webhook Response" : "Code"} node ${currentNodeId} returned ${outputItems.length} items`
          );
        } else if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          outputItems = inputItems; // Trigger just passes through
        } else {
          // Generic node - just pass through
          outputItems = inputItems;
        }

        const duration = Date.now() - startTime;
        console.log(`Node ${currentNodeId} execution completed:`, {
          inputItemsCount: inputItems.length,
          outputItemsCount: outputItems.length,
          firstOutputItem: outputItems[0],
        });
        nodeOutputs.set(currentNodeId, outputItems);
        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          status: "completed",
          output: outputItems, // Store items array
          duration,
        };

        // Add connected nodes to queue
        const nextConnections = workflowConnections.filter(
          (c) => c.sourceNodeId === currentNodeId
        );
        for (const conn of nextConnections) {
          if (!executedNodes.has(conn.targetNodeId)) {
            executionQueue.push(conn.targetNodeId);
          }
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          status: "failed",
          error: errorMessage,
          duration,
        };

        // Stop execution on error
        break;
      }
    }

    // Get final output from last executed node
    const finalNodeId = Array.from(executedNodes).pop();
    const finalOutput = finalNodeId ? nodeOutputs.get(finalNodeId) : undefined;

    return {
      success: Object.values(nodeResults).every(
        (r) => r.status === "completed"
      ),
      nodeResults,
      finalOutput,
    };
  }

  private async executeCodeNode(
    node: typeof nodes.$inferSelect,
    inputItems: ExecutionItem[],
    predecessorOutputs: Map<string, { nodeLabel: string; output: ExecutionItem[] }>,
    organizationId: string,
    typeDefinitions?: string
  ): Promise<ExecutionItem[]> {
    const code = (node.config as { code?: string })?.code;

    if (!code || code.trim() === "") {
      return inputItems; // Pass through if no code
    }

    try {
      // Extract import statements from user code
      const importRegex = /^import\s+.+\s+from\s+['"].+['"];?\s*$/gm;
      const imports = code.match(importRegex) || [];
      const codeWithoutImports = code.replace(importRegex, '').trim();

      // Convert imports to require statements for runtime
      const requireStatements = imports.map(importStmt => {
        // Handle: import defaultExport from "module"
        const defaultMatch = importStmt.match(/import\s+(\w+)\s+from\s+['"](.+)['"]/);
        if (defaultMatch && !importStmt.includes('{')) {
          return `const ${defaultMatch[1]} = require('${defaultMatch[2]}');`;
        }
        
        // Handle: import { named } from "module"
        const namedMatch = importStmt.match(/import\s+\{([^}]+)\}\s+from\s+['"](.+)['"]/);
        if (namedMatch) {
          const names = namedMatch[1].trim();
          const module = namedMatch[2];
          return `const { ${names} } = require('${module}');`;
        }
        
        // Handle: import * as name from "module"
        const namespaceMatch = importStmt.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"](.+)['"]/);
        if (namespaceMatch) {
          return `const ${namespaceMatch[1]} = require('${namespaceMatch[2]}');`;
        }
        
        return importStmt;
      }).join('\n');

      // Prepend type definitions to code if provided
      const fullCode = typeDefinitions 
        ? `${typeDefinitions}\n\n${code}`
        : code;

      // Add global declarations for runtime functions
      let predecessorDeclarations = '';
      predecessorOutputs.forEach((data, nodeId) => {
        const sanitizedLabel = data.nodeLabel.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
        const varName = `$${sanitizedLabel}`;
        predecessorDeclarations += `declare const ${varName}: { json: any; input: any[] };\n`;
      });

      const globalDeclarations = `
declare function require(moduleName: string): any;
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
declare const $input: any[];
declare const $json: any;
declare const $inputItem: any;
declare const $inputAll: any[];
${predecessorDeclarations}
`;

      // Wrap code in async function for type checking
      // Place imports at top level, then wrap the rest in a function
      const wrappedCodeForTypeCheck = `
        ${globalDeclarations}
        ${typeDefinitions || ''}
        ${imports.join('\n')}
        
        async function __userCode__() {
          ${codeWithoutImports}
        }
      `;

      // Create a virtual source file for type checking
      const fileName = "code.ts";
      const sourceFile = ts.createSourceFile(
        fileName,
        wrappedCodeForTypeCheck,
        ts.ScriptTarget.ES2020,
        true
      );

      // Create compiler options
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        lib: ['lib.es2020.d.ts'],
        strict: false, // Less strict to allow more flexibility
        noImplicitAny: false, // Allow implicit any
        strictNullChecks: false,
        strictFunctionTypes: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        skipLibCheck: true,
        types: [],
        noResolve: true, // Don't try to resolve imports
      };

      // Create a virtual compiler host that uses TypeScript's built-in lib files
      const host = ts.createCompilerHost(compilerOptions);
      const originalGetSourceFile = host.getSourceFile;
      
      host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (name === fileName) {
          return sourceFile;
        }
        // Let TypeScript load its default lib files from node_modules
        return originalGetSourceFile.call(host, name, languageVersion, onError, shouldCreateNewSourceFile);
      };

      // Create program for type checking
      const program = ts.createProgram([fileName], compilerOptions, host);
      
      // Get diagnostics (type errors)
      const diagnostics = ts.getPreEmitDiagnostics(program);

      // Check for TypeScript errors
      if (diagnostics.length > 0) {
        
        // Filter out module-related errors and runtime wrapper errors
        const skipErrorPatterns = [
          "Cannot find module",
          "Cannot find name 'require'",
          "has no exported member",
          "is not a module",
          "Cannot redeclare",
          "Duplicate identifier",
          "Top-level 'await'",
          "'await' expressions are only allowed",
          "'return' statement can only be used",
          "A 'return' statement can only be used",
        ];
        
        const errors = diagnostics
          .filter(d => d.category === ts.DiagnosticCategory.Error)
          .filter(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            // Skip errors that are expected - code is wrapped at runtime
            return !skipErrorPatterns.some(pattern => message.includes(pattern));
          })
          .map(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            if (diagnostic.file && diagnostic.start !== undefined) {
              const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
              // Adjust line number to account for wrapper function, imports, and type definitions
              const typeDefLines = typeDefinitions ? typeDefinitions.split('\n').length : 0;
              const importLines = imports.length;
              const wrapperLines = 3; // async function wrapper adds ~3 lines
              const adjustedLine = Math.max(1, line + 1 - typeDefLines - importLines - wrapperLines);
              return `Line ${adjustedLine}, Col ${character + 1}: ${message}`;
            }
            return message;
          });

        if (errors.length > 0) {
          throw new Error(`TypeScript Validation Error:\n\n${errors.join('\n\n')}`);
        }
      }

      // Transpile to JavaScript (without type checking, just syntax transformation)
      // Use the code with require statements instead of imports
      const codeForExecution = requireStatements 
        ? `${requireStatements}\n\n${codeWithoutImports}`
        : code;
        
      // DO NOT include type definitions in transpiled code - they only exist at compile time
      // and will cause runtime errors if included
      // Transpile code WITHOUT imports/requires for execution
      // The imports are already converted to require statements and stored separately
      const transpileResult = ts.transpileModule(codeWithoutImports, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      });
      const jsCodeWithoutRequires = transpileResult.outputText.trim();

      // Create a safe execution context with timeout
      const executeWithTimeout = async (
        code: string,
        timeoutMs: number = 5000
      ): Promise<ExecutionItem[]> => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Execution timeout"));
          }, timeoutMs);

          try {
            // Build safe console first
            const safeConsole = {
              log: (...args: unknown[]) => {
                console.log("[Node Execution]", ...args);
              },
              error: (...args: unknown[]) => {
                console.error("[Node Execution]", ...args);
              },
              warn: (...args: unknown[]) => {
                console.warn("[Node Execution]", ...args);
              },
            };

            // Create custom require function with organization's node_modules path
            const orgPackagesPath = packageManager.getNodeModulesPath(organizationId);
            
            // Create a require function that uses the organization's node_modules
            const orgPackageJsonPath = path.join(path.dirname(orgPackagesPath), 'package.json');
            let customRequire: (moduleName: string) => any;
            
            try {
              // Create a require function with the organization's package.json as base
              customRequire = Module.createRequire(orgPackageJsonPath);
            } catch {
              // Fallback to standard require if organization packages don't exist
              customRequire = require;
            }

            // Build parameter names and values for all predecessor nodes
            const paramNames: string[] = ["$input", "console", "require"];
            const paramValues: unknown[] = [inputItems, safeConsole, customRequire];
            
            // Build convenience variables code
            let convenienceVarsCode = `
                // Convenience variables for accessing previous node's data
                const $json = $input && $input.length > 0 ? $input[0].json : {};
                const $inputItem = $json; // Alias for $json
                const $inputAll = $input || [];
            `;
            
            // Add variables for all predecessor nodes as objects with .json and .input properties
            predecessorOutputs.forEach((data, nodeId) => {
              const sanitizedLabel = data.nodeLabel.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
              const varName = `$${sanitizedLabel}`;
              
              // Create an object with json and input properties
              const nodeData = {
                json: data.output && data.output.length > 0 ? data.output[0].json : {},
                input: data.output || [],
              };
              
              paramNames.push(varName);
              paramValues.push(nodeData);
            });
            
            // Code receives $input (items array) and should return items array
            // Provide convenience variables for accessing previous node's output
            // Use the transpiled JavaScript code (without TypeScript syntax like generics)
            const wrappedCode = `
              ${requireStatements}
              
              return (async function(${paramNames.join(", ")}) {
                ${convenienceVarsCode}
                
                ${jsCodeWithoutRequires}
              })(${paramNames.map((_, i) => `arguments[${i}]`).join(", ")});
            `;

            const fn = new Function(...paramNames, wrappedCode);

            Promise.resolve(fn(...paramValues))
              .then((result) => {
                clearTimeout(timeout);

                // Handle different return types
                let outputItems: ExecutionItem[] = [];

                // Check if the user code explicitly checked for undefined/null and returned it
                // In that case, we should still respect it as a value, not pass through
                if (result === undefined) {
                  // Check if it's a primitive undefined return (code returned undefined)
                  // In this case, we should treat it as a value, not pass through
                  outputItems = [{ json: { value: null } }];
                } else if (result === null) {
                  outputItems = [{ json: { value: null } }];
                } else if (Array.isArray(result)) {
                  // Array returned - check if it's items array or plain array
                  if (result.length > 0 && result[0]?.json !== undefined) {
                    // Already in items format
                    outputItems = result as ExecutionItem[];
                  } else {
                    // Plain array - convert to items format
                    outputItems = result.map((item: unknown) => ({
                      json:
                        typeof item === "object" && item !== null
                          ? (item as Record<string, unknown>)
                          : { value: item },
                    }));
                  }
                } else if (typeof result === "object") {
                  // Object returned - convert to single item
                  outputItems = [{ json: result as Record<string, unknown> }];
                } else {
                  // Primitive value - convert to single item
                  outputItems = [{ json: { value: result } }];
                }

                resolve(outputItems);
              })
              .catch((error) => {
                clearTimeout(timeout);
                reject(error);
              });
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      };

      const result = await executeWithTimeout(jsCodeWithoutRequires, 5000);
      return result;
    } catch (error) {
      throw new Error(
        `Code execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export const workflowExecutor = new WorkflowExecutor();
