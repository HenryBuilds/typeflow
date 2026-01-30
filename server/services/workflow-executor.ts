import { db } from "@/db/db";
import { workflows, nodes, connections, executions, customNodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as ts from "typescript";
import { packageManager } from "./package-manager";
import { credentialService } from "./credential-service";
import { nodeLoader } from "./node-loader";
import { declarativeExecutor } from "./declarative-executor";
import { programmaticExecutor } from "./programmatic-executor";
import * as Module from "module";
import * as path from "path";
import { createLogger } from "@/lib/logger";
import {
  executeFilterNode,
  executeLimitNode,
  executeRemoveDuplicatesNode,
  executeSplitOutNode,
  executeAggregateNode,
  executeMergeNode,
  executeSummarizeNode,
  executeDateTimeNode,
  executeEditFieldsNode
} from "./data-transform-executor";
import { 
  executePostgresNode, 
  executeMySQLNode, 
  executeMongoDBNode, 
  executeRedisNode,
  interpolateExpressions 
} from "./database-executor";
import { executeCodeNode, executeUtilitiesNode, extractFunctionNames } from "./code-executor";
import { executeCustomNode } from "./custom-node-executor";
import { executeHttpRequestNode, executeWaitNode } from "./http-executor";
import { executeSubworkflow } from "./subworkflow-executor";

const log = createLogger('WorkflowExecutor');
import type {
  DebugExecutionOptions,
  DebugExecutionResult,
  DebugStackFrame,
  DebugPreviousState,
} from "@/types/debugger";
import type {
  ExecutionItem,
  NodeExecutionResult,
  WorkflowExecutionResult,
} from "@/types/execution";

// ExecutionItem, NodeExecutionResult, WorkflowExecutionResult imported from types/execution

export class WorkflowExecutor {
  async executeUntilNode(
    workflowId: string,
    organizationId: string,
    targetNodeId: string,
    triggerData?: Record<string, unknown>
  ): Promise<WorkflowExecutionResult> {
    log.info({ workflowId, organizationId, targetNodeId }, 'Starting executeUntilNode');
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
      log.error({ workflowId, organizationId }, 'Workflow not found');
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

    // Find trigger, webhook, or workflowTrigger node
    const triggerNode = workflow.nodes.find((n) => n.type === "trigger" || n.type === "webhook" || n.type === "workflowTrigger") || workflow.nodes[0];
    if (!triggerNode) {
      throw new Error("No trigger node found");
    }

    // Pre-execute all utilities nodes to make their functions available
    const utilities = new Map<string, { label: string; exports: Record<string, any>; code: string }>();
    const utilityNodes = workflow.nodes.filter(n => n.type === "utilities");
    
    for (const utilityNode of utilityNodes) {
      try {
        const utilityCode = (utilityNode.config as { code?: string })?.code || '';
        const exports = await executeUtilitiesNode(utilityNode, organizationId, typeDefinitions);
        utilities.set(utilityNode.id, { 
          label: utilityNode.label || "Utilities", 
          exports,
          code: utilityCode
        });
        
        // Mark as executed successfully
        nodeResults[utilityNode.id] = {
          nodeId: utilityNode.id,
          nodeLabel: utilityNode.label,
          status: "completed",
          output: [{ json: { exports: Object.keys(exports) } }],
          duration: 0,
        };
      } catch (error: any) {
        nodeResults[utilityNode.id] = {
          nodeId: utilityNode.id,
          nodeLabel: utilityNode.label,
          status: "failed",
          error: error.message,
          duration: 0,
        };
        throw new Error(`Utilities node ${utilityNode.label || utilityNode.id} failed: ${error.message}`);
      }
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

        if (currentNode.type === "trigger" || currentNode.type === "webhook" || currentNode.type === "workflowTrigger") {
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
          
          outputItems = await executeCodeNode(currentNode, inputItems, predecessorOutputs, organizationId, typeDefinitions, utilities);
          
        } else if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          outputItems = inputItems;
        } else if (currentNode.type === "utilities") {
          // Utilities nodes are pre-executed, skip them in the main loop
          continue;
        } else if (currentNode.type === "executeWorkflow") {
          // Execute a subworkflow
          outputItems = await executeSubworkflow(currentNode, inputItems, organizationId, this.executeWorkflow.bind(this));
        } else if (currentNode.type === "manualTrigger" || currentNode.type === "scheduleTrigger" || currentNode.type === "chatTrigger" || currentNode.type === "workflowTrigger") {
          // Trigger nodes - pass through trigger data or empty item
          outputItems = inputItems.length > 0 ? inputItems : [{ json: {} }];
        } else if (currentNode.type === "noop") {
          // No operation - pass through
          outputItems = inputItems;
        } else if (currentNode.type === "postgres") {
          outputItems = await executePostgresNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "mysql") {
          outputItems = await executeMySQLNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "mongodb") {
          outputItems = await executeMongoDBNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "redis") {
          outputItems = await executeRedisNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "filter") {
          outputItems = executeFilterNode(currentNode, inputItems);
        } else if (currentNode.type === "limit") {
          outputItems = executeLimitNode(currentNode, inputItems);
        } else if (currentNode.type === "removeDuplicates") {
          outputItems = executeRemoveDuplicatesNode(currentNode, inputItems);
        } else if (currentNode.type === "splitOut") {
          outputItems = executeSplitOutNode(currentNode, inputItems);
        } else if (currentNode.type === "aggregate") {
          outputItems = executeAggregateNode(currentNode, inputItems);
        } else if (currentNode.type === "merge") {
          outputItems = executeMergeNode(currentNode, inputItems);
        } else if (currentNode.type === "summarize") {
          outputItems = executeSummarizeNode(currentNode, inputItems);
        } else if (currentNode.type === "dateTime") {
          outputItems = executeDateTimeNode(currentNode, inputItems);
        } else if (currentNode.type === "editFields") {
          outputItems = executeEditFieldsNode(currentNode, inputItems);
        } else if (currentNode.type === "httpRequest") {
          outputItems = await executeHttpRequestNode(currentNode, inputItems);
        } else if (currentNode.type === "wait") {
          outputItems = await executeWaitNode(currentNode, inputItems);
        } else if (currentNode.type.startsWith("custom_")) {
          // Custom node (in-app) - execute user-defined code
          outputItems = await executeCustomNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "externalNode") {
          // External node from package - lookup actual node type from config
          const externalNodeType = (currentNode.config as Record<string, unknown>)?.externalNodeType as string;
          
          if (!externalNodeType || !nodeLoader.hasNode(externalNodeType)) {
            throw new Error(`External node type '${externalNodeType}' not found`);
          }
          
          const nodeType = nodeLoader.getNode(externalNodeType)!;
          const nodeConfig = currentNode.config as Record<string, unknown> || {};
          
          if (nodeType.execute) {
            // Programmatic style
            outputItems = await programmaticExecutor.execute(
              nodeType,
              inputItems,
              nodeConfig,
              organizationId,
              { id: workflowId, name: workflow.name }
            );
          } else {
            // Declarative style (routing-based)
            const creds = await credentialService.getCredentials(organizationId);
            outputItems = await declarativeExecutor.execute(
              nodeType,
              inputItems,
              nodeConfig,
              creds as Record<string, unknown>
            );
          }
        } else {
          outputItems = inputItems;
        }

        const duration = Date.now() - startTime;
        

        nodeOutputs.set(currentNodeId, outputItems);
        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          nodeLabel: currentNode?.label,
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
        log.error({ err: error, nodeId: currentNodeId, duration }, 'Node execution failed');

        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          nodeLabel: currentNode?.label,
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
    log.info({ workflowId, organizationId }, 'Starting executeWorkflow');
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
      log.error({ workflowId, organizationId }, 'Workflow not found');
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

    // Find trigger or webhook node (first node or node with type "trigger", "webhook", or "workflowTrigger")
    const triggerNode =
      workflow.nodes.find((n) => n.type === "trigger" || n.type === "webhook" || n.type === "workflowTrigger") || workflow.nodes[0];

    if (!triggerNode) {
      throw new Error("No trigger or webhook node found");
    }

    // Pre-execute all utilities nodes to make their functions available
    const utilities = new Map<string, { label: string; exports: Record<string, any>; code: string }>();
    const utilityNodes = workflow.nodes.filter(n => n.type === "utilities");
    
    for (const utilityNode of utilityNodes) {
      try {
        const utilityCode = (utilityNode.config as { code?: string })?.code || '';
        const exports = await executeUtilitiesNode(utilityNode, organizationId, typeDefinitions);
        utilities.set(utilityNode.id, { 
          label: utilityNode.label || "Utilities", 
          exports,
          code: utilityCode
        });
        
        // Mark as executed successfully
        nodeResults[utilityNode.id] = {
          nodeId: utilityNode.id,
          nodeLabel: utilityNode.label,
          status: "completed",
          output: [{ json: { exports: Object.keys(exports) } }],
          duration: 0,
        };
      } catch (error: any) {
        nodeResults[utilityNode.id] = {
          nodeId: utilityNode.id,
          nodeLabel: utilityNode.label,
          status: "failed",
          error: error.message,
          duration: 0,
        };
        throw new Error(`Utilities node ${utilityNode.label || utilityNode.id} failed: ${error.message}`);
      }
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
        if (currentNode.type === "trigger" || currentNode.type === "webhook" || currentNode.type === "workflowTrigger") {
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
          
          outputItems = await executeCodeNode(currentNode, inputItems, predecessorOutputs, organizationId, typeDefinitions, utilities);
          
        } else if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          outputItems = inputItems; // Trigger just passes through
        } else if (currentNode.type === "utilities") {
          // Utilities nodes are pre-executed, skip them in the main loop
          continue;
        } else if (currentNode.type === "executeWorkflow") {
          // Execute a subworkflow
          outputItems = await executeSubworkflow(currentNode, inputItems, organizationId, this.executeWorkflow.bind(this));
          
        } else if (currentNode.type === "manualTrigger" || currentNode.type === "scheduleTrigger" || currentNode.type === "chatTrigger" || currentNode.type === "workflowTrigger") {
          // Trigger nodes - pass through trigger data or empty item
          outputItems = inputItems.length > 0 ? inputItems : [{ json: {} }];
        } else if (currentNode.type === "noop") {
          // No operation - pass through
          outputItems = inputItems;
        } else if (currentNode.type === "postgres") {
          outputItems = await executePostgresNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "mysql") {
          outputItems = await executeMySQLNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "mongodb") {
          outputItems = await executeMongoDBNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "redis") {
          outputItems = await executeRedisNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "filter") {
          outputItems = executeFilterNode(currentNode, inputItems);
          
        } else if (currentNode.type === "limit") {
          outputItems = executeLimitNode(currentNode, inputItems);
          
        } else if (currentNode.type === "removeDuplicates") {
          outputItems = executeRemoveDuplicatesNode(currentNode, inputItems);
          
        } else if (currentNode.type === "splitOut") {
          outputItems = executeSplitOutNode(currentNode, inputItems);
          
        } else if (currentNode.type === "aggregate") {
          outputItems = executeAggregateNode(currentNode, inputItems);
          
        } else if (currentNode.type === "merge") {
          outputItems = executeMergeNode(currentNode, inputItems);
          
        } else if (currentNode.type === "summarize") {
          outputItems = executeSummarizeNode(currentNode, inputItems);
          
        } else if (currentNode.type === "dateTime") {
          outputItems = executeDateTimeNode(currentNode, inputItems);
          
        } else if (currentNode.type === "editFields") {
          outputItems = executeEditFieldsNode(currentNode, inputItems);
          
        } else if (currentNode.type === "httpRequest") {
          outputItems = await executeHttpRequestNode(currentNode, inputItems);
          
        } else if (currentNode.type === "wait") {
          outputItems = await executeWaitNode(currentNode, inputItems);
          
        } else if (currentNode.type.startsWith("custom_")) {
          // Custom node (in-app) - execute user-defined code
          outputItems = await executeCustomNode(currentNode, inputItems, organizationId);
          
        } else if (currentNode.type === "externalNode") {
          // External node from package - lookup actual node type from config
          const externalNodeType = (currentNode.config as Record<string, unknown>)?.externalNodeType as string;
          
          if (!externalNodeType || !nodeLoader.hasNode(externalNodeType)) {
            throw new Error(`External node type '${externalNodeType}' not found`);
          }
          
          const nodeType = nodeLoader.getNode(externalNodeType)!;
          const nodeConfig = currentNode.config as Record<string, unknown> || {};
          
          if (nodeType.execute) {
            // Programmatic style
            outputItems = await programmaticExecutor.execute(
              nodeType,
              inputItems,
              nodeConfig,
              organizationId,
              { id: workflowId, name: workflow.name }
            );
          } else {
            // Declarative style (routing-based)
            const creds = await credentialService.getCredentials(organizationId);
            outputItems = await declarativeExecutor.execute(
              nodeType,
              inputItems,
              nodeConfig,
              creds as Record<string, unknown>
            );
          }
          
        } else if (nodeLoader.hasNode(currentNode.type)) {
          // External node package - use appropriate executor
          const nodeType = nodeLoader.getNode(currentNode.type)!;
          const nodeConfig = currentNode.config as Record<string, unknown> || {};
          
          if (nodeType.execute) {
            // Programmatic style
            outputItems = await programmaticExecutor.execute(
              nodeType,
              inputItems,
              nodeConfig,
              organizationId,
              { id: workflowId, name: workflow.name }
            );
          } else {
            // Declarative style (routing-based)
            const creds = await credentialService.getCredentials(organizationId);
            outputItems = await declarativeExecutor.execute(
              nodeType,
              inputItems,
              nodeConfig,
              creds as Record<string, unknown>
            );
          }
          
        } else {
          // Generic node - just pass through
          outputItems = inputItems;
        }

        const duration = Date.now() - startTime;
        
        nodeOutputs.set(currentNodeId, outputItems);
        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          nodeLabel: currentNode?.label,
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
          nodeLabel: currentNode?.label,
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

  /**
   * Execute workflow with debug support - pauses at breakpoints
   */
  async executeWithDebug(
    workflowId: string,
    organizationId: string,
    options: DebugExecutionOptions,
    triggerData?: Record<string, unknown>
  ): Promise<DebugExecutionResult> {
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

    // Initialize from previous state or start fresh
    const nodeOutputs = new Map<string, ExecutionItem[]>(
      options.previousState?.nodeOutputs
        ? Object.entries(options.previousState.nodeOutputs)
        : []
    );
    const nodeResults: Record<string, NodeExecutionResult> =
      options.previousState?.nodeResults || {};
    const callStack: DebugStackFrame[] =
      options.previousState?.callStack || [];

    // Find trigger, webhook, or workflowTrigger node
    const triggerNode = workflow.nodes.find((n) => n.type === "trigger" || n.type === "webhook" || n.type === "workflowTrigger") || workflow.nodes[0];
    if (!triggerNode) {
      throw new Error("No trigger node found");
    }

    // Pre-execute all utilities nodes
    const utilities = new Map<string, { label: string; exports: Record<string, any>; code: string }>();
    const utilityNodes = workflow.nodes.filter(n => n.type === "utilities");

    for (const utilityNode of utilityNodes) {
      // Skip if already executed in previous state
      if (nodeResults[utilityNode.id]?.status === "completed") {
        continue;
      }

      try {
        const utilityCode = (utilityNode.config as { code?: string })?.code || '';
        const exports = await executeUtilitiesNode(utilityNode, organizationId, typeDefinitions);
        utilities.set(utilityNode.id, {
          label: utilityNode.label || "Utilities",
          exports,
          code: utilityCode
        });

        nodeResults[utilityNode.id] = {
          nodeId: utilityNode.id,
          nodeLabel: utilityNode.label,
          status: "completed",
          output: [{ json: { exports: Object.keys(exports) } }],
          duration: 0,
        };
      } catch (error: any) {
        nodeResults[utilityNode.id] = {
          nodeId: utilityNode.id,
          nodeLabel: utilityNode.label,
          status: "failed",
          error: error.message,
          duration: 0,
        };

        return {
          success: false,
          nodeResults,
          nodeOutputs: Object.fromEntries(nodeOutputs),
          error: `Utilities node failed: ${error.message}`,
          isPaused: false,
          nextNodeIds: [],
          callStack,
        };
      }
    }

    // Determine starting point
    const executedNodes = new Set<string>(
      Object.keys(nodeResults).filter(id => nodeResults[id].status === "completed")
    );

    let executionQueue: string[] = [];

    if (options.previousState?.lastExecutedNodeId) {
      // Resume from where we left off - add next nodes to queue
      const outgoingConns = workflowConnections.filter(
        c => c.sourceNodeId === options.previousState!.lastExecutedNodeId
      );
      executionQueue = outgoingConns.map(c => c.targetNodeId);
    } else {
      // Start from trigger
      executionQueue = [triggerNode.id];
    }

    while (executionQueue.length > 0) {
      const currentNodeId = executionQueue.shift()!;

      if (executedNodes.has(currentNodeId)) {
        continue;
      }

      const currentNode = nodeMap.get(currentNodeId);
      if (!currentNode) {
        continue;
      }

      // Check if this node has a breakpoint BEFORE executing
      if (options.breakpoints.has(currentNodeId) && !options.stopAtNode) {
        // Find next possible nodes
        const outgoingConns = workflowConnections.filter(c => c.sourceNodeId === currentNodeId);
        const nextNodeIds = outgoingConns.map(c => c.targetNodeId);

        return {
          success: true,
          nodeResults,
          nodeOutputs: Object.fromEntries(nodeOutputs),
          isPaused: true,
          pausedAtNodeId: currentNodeId,
          nextNodeIds,
          callStack,
        };
      }

      executedNodes.add(currentNodeId);
      const startTime = Date.now();

      try {
        // Get input items
        let inputItems: ExecutionItem[] = [];

        if (currentNode.type === "trigger" || currentNode.type === "webhook" || currentNode.type === "workflowTrigger") {
          inputItems = triggerData ? [{ json: triggerData }] : [{ json: {} }];
        } else {
          const inputConnections = workflowConnections.filter(
            (c) => c.targetNodeId === currentNodeId
          );

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

        // Add to call stack before execution
        const stackFrame: DebugStackFrame = {
          nodeId: currentNodeId,
          nodeLabel: currentNode.label || currentNodeId,
          nodeType: currentNode.type,
          timestamp: Date.now(),
          input: inputItems,
        };

        let outputItems: ExecutionItem[] = [];

        // Execute node based on type (same logic as executeWorkflow)
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

          try {
            outputItems = await executeCodeNode(currentNode, inputItems, predecessorOutputs, organizationId, typeDefinitions, utilities);
          } catch (error: any) {
            // Capture stack trace for code node errors
            if (options.captureStackTraces) {
              stackFrame.error = error.message;
              stackFrame.sourceLocation = this.parseCodeNodeError(error, currentNode);
            }
            throw error;
          }
        } else if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          outputItems = inputItems;
        } else if (currentNode.type === "utilities") {
          continue;
        } else if (currentNode.type === "executeWorkflow") {
          outputItems = await executeSubworkflow(currentNode, inputItems, organizationId, this.executeWorkflow.bind(this));
        } else if (currentNode.type === "manualTrigger" || currentNode.type === "scheduleTrigger" || currentNode.type === "chatTrigger" || currentNode.type === "workflowTrigger") {
          outputItems = inputItems.length > 0 ? inputItems : [{ json: {} }];
        } else if (currentNode.type === "noop") {
          outputItems = inputItems;
        } else if (currentNode.type === "postgres") {
          outputItems = await executePostgresNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "mysql") {
          outputItems = await executeMySQLNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "mongodb") {
          outputItems = await executeMongoDBNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "redis") {
          outputItems = await executeRedisNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "filter") {
          outputItems = executeFilterNode(currentNode, inputItems);
        } else if (currentNode.type === "limit") {
          outputItems = executeLimitNode(currentNode, inputItems);
        } else if (currentNode.type === "removeDuplicates") {
          outputItems = executeRemoveDuplicatesNode(currentNode, inputItems);
        } else if (currentNode.type === "splitOut") {
          outputItems = executeSplitOutNode(currentNode, inputItems);
        } else if (currentNode.type === "aggregate") {
          outputItems = executeAggregateNode(currentNode, inputItems);
        } else if (currentNode.type === "merge") {
          outputItems = executeMergeNode(currentNode, inputItems);
        } else if (currentNode.type === "summarize") {
          outputItems = executeSummarizeNode(currentNode, inputItems);
        } else if (currentNode.type === "dateTime") {
          outputItems = executeDateTimeNode(currentNode, inputItems);
        } else if (currentNode.type === "editFields") {
          outputItems = executeEditFieldsNode(currentNode, inputItems);
        } else if (currentNode.type === "httpRequest") {
          outputItems = await executeHttpRequestNode(currentNode, inputItems);
        } else if (currentNode.type === "wait") {
          outputItems = await executeWaitNode(currentNode, inputItems);
        } else if (currentNode.type.startsWith("custom_")) {
          outputItems = await executeCustomNode(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "externalNode") {
          // External node from package - lookup actual node type from config
          const externalNodeType = (currentNode.config as Record<string, unknown>)?.externalNodeType as string;
          
          if (!externalNodeType || !nodeLoader.hasNode(externalNodeType)) {
            throw new Error(`External node type '${externalNodeType}' not found`);
          }
          
          const nodeType = nodeLoader.getNode(externalNodeType)!;
          const nodeConfig = currentNode.config as Record<string, unknown> || {};
          
          if (nodeType.execute) {
            outputItems = await programmaticExecutor.execute(
              nodeType,
              inputItems,
              nodeConfig,
              organizationId,
              { id: workflowId, name: workflow.name }
            );
          } else {
            const creds = await credentialService.getCredentials(organizationId);
            outputItems = await declarativeExecutor.execute(
              nodeType,
              inputItems,
              nodeConfig,
              creds as Record<string, unknown>
            );
          }
        } else {
          outputItems = inputItems;
        }

        const duration = Date.now() - startTime;

        // Update stack frame with output
        stackFrame.output = outputItems;
        callStack.push(stackFrame);

        nodeOutputs.set(currentNodeId, outputItems);
        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          nodeLabel: currentNode?.label,
          status: "completed",
          output: outputItems,
          duration,
        };

        // Check if we should stop at this node (for step-over)
        if (options.stopAtNode === currentNodeId) {
          const outgoingConns = workflowConnections.filter(c => c.sourceNodeId === currentNodeId);
          const nextNodeIds = outgoingConns.map(c => c.targetNodeId);

          return {
            success: true,
            nodeResults,
            nodeOutputs: Object.fromEntries(nodeOutputs),
            isPaused: true,
            pausedAtNodeId: currentNodeId,
            nextNodeIds,
            callStack,
          };
        }

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
        const errorMessage = error instanceof Error ? error.message : String(error);

        nodeResults[currentNodeId] = {
          nodeId: currentNodeId,
          nodeLabel: currentNode?.label,
          status: "failed",
          error: errorMessage,
          duration,
        };

        return {
          success: false,
          nodeResults,
          nodeOutputs: Object.fromEntries(nodeOutputs),
          error: errorMessage,
          isPaused: false,
          nextNodeIds: [],
          callStack,
        };
      }
    }

    // Get final output from last executed node
    const finalNodeId = Array.from(executedNodes).pop();
    const finalOutput = finalNodeId ? nodeOutputs.get(finalNodeId) : undefined;

    return {
      success: Object.values(nodeResults).every((r) => r.status === "completed"),
      nodeResults,
      nodeOutputs: Object.fromEntries(nodeOutputs),
      finalOutput,
      isPaused: false,
      nextNodeIds: [],
      callStack,
    };
  }

  /**
   * Execute exactly one node and pause - used for step-over debugging
   */
  async executeOneNode(
    workflowId: string,
    organizationId: string,
    targetNodeId: string,
    previousState: DebugPreviousState,
    triggerData?: Record<string, unknown>
  ): Promise<DebugExecutionResult> {
    return this.executeWithDebug(
      workflowId,
      organizationId,
      {
        breakpoints: new Set(),
        stopAtNode: targetNodeId,
        captureStackTraces: true,
        previousState,
      },
      triggerData
    );
  }

  /**
   * Parse code node errors to extract source location
   */
  private parseCodeNodeError(
    error: Error,
    node: typeof nodes.$inferSelect
  ): { line: number; column: number; code: string } | undefined {
    const code = (node.config as { code?: string })?.code || '';
    const lines = code.split('\n');

    // Try to extract line number from error stack
    const stackMatch = error.stack?.match(/:(\d+):(\d+)/);
    if (stackMatch) {
      const line = parseInt(stackMatch[1], 10);
      const column = parseInt(stackMatch[2], 10);

      // Get surrounding code context
      const startLine = Math.max(0, line - 3);
      const endLine = Math.min(lines.length, line + 2);
      const codeContext = lines.slice(startLine, endLine).join('\n');

      return { line, column, code: codeContext };
    }

    return undefined;
  }

  /**
   * Get the next executable nodes from a given node
   */
  async getNextNodes(
    workflowId: string,
    currentNodeId: string
  ): Promise<string[]> {
    const workflowConnections = await db.query.connections.findMany({
      where: eq(connections.workflowId, workflowId),
    });

    return workflowConnections
      .filter(c => c.sourceNodeId === currentNodeId)
      .map(c => c.targetNodeId);
  }
}

export const workflowExecutor = new WorkflowExecutor();


