import { db } from "@/db/db";
import { workflows, nodes, connections, executions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as ts from "typescript";
import { packageManager } from "./package-manager";
import { credentialService } from "./credential-service";
import * as Module from "module";
import * as path from "path";
import type {
  DebugExecutionOptions,
  DebugExecutionResult,
  DebugStackFrame,
  DebugPreviousState,
  NodeExecutionResult,
} from "@/types/debugger";

// Execution item structure
interface ExecutionItem {
  json: Record<string, unknown>;
  binary?: Record<string, unknown>;
  pairedItem?: {
    item: number;
  };
}

// NodeExecutionResult imported from types/debugger

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

    // Pre-execute all utilities nodes to make their functions available
    const utilities = new Map<string, { label: string; exports: Record<string, any>; code: string }>();
    const utilityNodes = workflow.nodes.filter(n => n.type === "utilities");
    
    for (const utilityNode of utilityNodes) {
      try {
        const utilityCode = (utilityNode.config as { code?: string })?.code || '';
        const exports = await this.executeUtilitiesNode(utilityNode, organizationId, typeDefinitions);
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
          
          outputItems = await this.executeCodeNode(currentNode, inputItems, predecessorOutputs, organizationId, typeDefinitions, utilities);
          console.log(`${currentNode.type === "webhookResponse" ? "Webhook Response" : "Code"} node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          outputItems = inputItems;
        } else if (currentNode.type === "utilities") {
          // Utilities nodes are pre-executed, skip them in the main loop
          continue;
        } else if (currentNode.type === "manualTrigger" || currentNode.type === "scheduleTrigger" || currentNode.type === "chatTrigger") {
          // Trigger nodes - pass through trigger data or empty item
          outputItems = inputItems.length > 0 ? inputItems : [{ json: {} }];
        } else if (currentNode.type === "noop") {
          // No operation - pass through
          outputItems = inputItems;
        } else if (currentNode.type === "filter") {
          outputItems = this.executeFilterNode(currentNode, inputItems);
        } else if (currentNode.type === "limit") {
          outputItems = this.executeLimitNode(currentNode, inputItems);
        } else if (currentNode.type === "removeDuplicates") {
          outputItems = this.executeRemoveDuplicatesNode(currentNode, inputItems);
        } else if (currentNode.type === "splitOut") {
          outputItems = this.executeSplitOutNode(currentNode, inputItems);
        } else if (currentNode.type === "aggregate") {
          outputItems = this.executeAggregateNode(currentNode, inputItems);
        } else if (currentNode.type === "merge") {
          outputItems = this.executeMergeNode(currentNode, inputItems);
        } else if (currentNode.type === "summarize") {
          outputItems = this.executeSummarizeNode(currentNode, inputItems);
        } else if (currentNode.type === "dateTime") {
          outputItems = this.executeDateTimeNode(currentNode, inputItems);
        } else if (currentNode.type === "editFields") {
          outputItems = this.executeEditFieldsNode(currentNode, inputItems);
        } else if (currentNode.type === "httpRequest") {
          outputItems = await this.executeHttpRequestNode(currentNode, inputItems);
        } else if (currentNode.type === "wait") {
          outputItems = await this.executeWaitNode(currentNode, inputItems);
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
        console.error(`Node ${currentNodeId} execution failed:`, errorMessage);

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

    // Pre-execute all utilities nodes to make their functions available
    const utilities = new Map<string, { label: string; exports: Record<string, any>; code: string }>();
    const utilityNodes = workflow.nodes.filter(n => n.type === "utilities");
    
    for (const utilityNode of utilityNodes) {
      try {
        const utilityCode = (utilityNode.config as { code?: string })?.code || '';
        const exports = await this.executeUtilitiesNode(utilityNode, organizationId, typeDefinitions);
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
          
          outputItems = await this.executeCodeNode(currentNode, inputItems, predecessorOutputs, organizationId, typeDefinitions, utilities);
          console.log(
            `${currentNode.type === "webhookResponse" ? "Webhook Response" : "Code"} node ${currentNodeId} returned ${outputItems.length} items`
          );
        } else if (currentNode.type === "trigger" || currentNode.type === "webhook") {
          outputItems = inputItems; // Trigger just passes through
        } else if (currentNode.type === "utilities") {
          // Utilities nodes are pre-executed, skip them in the main loop
          continue;
        } else if (currentNode.type === "executeWorkflow") {
          // Execute a subworkflow
          outputItems = await this.executeSubworkflow(currentNode, inputItems, organizationId);
          console.log(`Execute Workflow node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "manualTrigger" || currentNode.type === "scheduleTrigger" || currentNode.type === "chatTrigger") {
          // Trigger nodes - pass through trigger data or empty item
          outputItems = inputItems.length > 0 ? inputItems : [{ json: {} }];
        } else if (currentNode.type === "noop") {
          // No operation - pass through
          outputItems = inputItems;
        } else if (currentNode.type === "filter") {
          outputItems = this.executeFilterNode(currentNode, inputItems);
          console.log(`Filter node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "limit") {
          outputItems = this.executeLimitNode(currentNode, inputItems);
          console.log(`Limit node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "removeDuplicates") {
          outputItems = this.executeRemoveDuplicatesNode(currentNode, inputItems);
          console.log(`RemoveDuplicates node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "splitOut") {
          outputItems = this.executeSplitOutNode(currentNode, inputItems);
          console.log(`SplitOut node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "aggregate") {
          outputItems = this.executeAggregateNode(currentNode, inputItems);
          console.log(`Aggregate node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "merge") {
          // Merge node gets inputs from multiple sources - already combined in inputItems
          outputItems = this.executeMergeNode(currentNode, inputItems);
          console.log(`Merge node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "summarize") {
          outputItems = this.executeSummarizeNode(currentNode, inputItems);
          console.log(`Summarize node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "dateTime") {
          outputItems = this.executeDateTimeNode(currentNode, inputItems);
          console.log(`DateTime node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "editFields") {
          outputItems = this.executeEditFieldsNode(currentNode, inputItems);
          console.log(`EditFields node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "httpRequest") {
          outputItems = await this.executeHttpRequestNode(currentNode, inputItems);
          console.log(`HttpRequest node ${currentNodeId} returned ${outputItems.length} items`);
        } else if (currentNode.type === "wait") {
          outputItems = await this.executeWaitNode(currentNode, inputItems);
          console.log(`Wait node ${currentNodeId} returned ${outputItems.length} items`);
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

    // Find trigger or webhook node
    const triggerNode = workflow.nodes.find((n) => n.type === "trigger" || n.type === "webhook") || workflow.nodes[0];
    if (!triggerNode) {
      throw new Error("No trigger or webhook node found");
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
        const exports = await this.executeUtilitiesNode(utilityNode, organizationId, typeDefinitions);
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

        if (currentNode.type === "trigger" || currentNode.type === "webhook") {
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
            outputItems = await this.executeCodeNode(currentNode, inputItems, predecessorOutputs, organizationId, typeDefinitions, utilities);
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
          outputItems = await this.executeSubworkflow(currentNode, inputItems, organizationId);
        } else if (currentNode.type === "manualTrigger" || currentNode.type === "scheduleTrigger" || currentNode.type === "chatTrigger") {
          outputItems = inputItems.length > 0 ? inputItems : [{ json: {} }];
        } else if (currentNode.type === "noop") {
          outputItems = inputItems;
        } else if (currentNode.type === "filter") {
          outputItems = this.executeFilterNode(currentNode, inputItems);
        } else if (currentNode.type === "limit") {
          outputItems = this.executeLimitNode(currentNode, inputItems);
        } else if (currentNode.type === "removeDuplicates") {
          outputItems = this.executeRemoveDuplicatesNode(currentNode, inputItems);
        } else if (currentNode.type === "splitOut") {
          outputItems = this.executeSplitOutNode(currentNode, inputItems);
        } else if (currentNode.type === "aggregate") {
          outputItems = this.executeAggregateNode(currentNode, inputItems);
        } else if (currentNode.type === "merge") {
          outputItems = this.executeMergeNode(currentNode, inputItems);
        } else if (currentNode.type === "summarize") {
          outputItems = this.executeSummarizeNode(currentNode, inputItems);
        } else if (currentNode.type === "dateTime") {
          outputItems = this.executeDateTimeNode(currentNode, inputItems);
        } else if (currentNode.type === "editFields") {
          outputItems = this.executeEditFieldsNode(currentNode, inputItems);
        } else if (currentNode.type === "httpRequest") {
          outputItems = await this.executeHttpRequestNode(currentNode, inputItems);
        } else if (currentNode.type === "wait") {
          outputItems = await this.executeWaitNode(currentNode, inputItems);
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

  private extractFunctionNames(code: string): string[] {
    const functions: string[] = [];
    
    // Match function declarations: function name(...) { ... }
    const functionMatches = code.matchAll(/function\s+([a-zA-Z_$][\w$]*)\s*\(/g);
    for (const match of functionMatches) {
      functions.push(match[1]);
    }
    
    // Match arrow functions: const name = (...) => ...
    const arrowMatches = code.matchAll(/const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g);
    for (const match of arrowMatches) {
      functions.push(match[1]);
    }
    
    // Match named exports in module.exports
    const exportMatch = code.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (exportMatch) {
      const exportedNames = exportMatch[1]
        .split(',')
        .map(name => name.trim().split(':')[0].trim())
        .filter(Boolean);
      // Use exported names if available, otherwise use all found functions
      return exportedNames.length > 0 ? exportedNames : functions;
    }
    
    return functions;
  }

  private async executeUtilitiesNode(
    node: typeof nodes.$inferSelect,
    organizationId: string,
    typeDefinitions?: string
  ): Promise<Record<string, any>> {
    const code = (node.config as { code?: string })?.code;

    if (!code || code.trim() === "") {
      return {}; // No functions if no code
    }

    try {
      // Extract import statements
      const importRegex = /^import\s+.+\s+from\s+['"].+['"];?\s*$/gm;
      const imports = code.match(importRegex) || [];
      const codeWithoutImports = code.replace(importRegex, '').trim();

      // Convert imports to require statements
      const requireStatements = imports.map(importStmt => {
        const defaultMatch = importStmt.match(/import\s+(\w+)\s+from\s+['"](.+)['"]/);
        if (defaultMatch && !importStmt.includes('{')) {
          return `const ${defaultMatch[1]} = require('${defaultMatch[2]}');`;
        }
        
        const namedMatch = importStmt.match(/import\s+\{([^}]+)\}\s+from\s+['"](.+)['"]/);
        if (namedMatch) {
          const names = namedMatch[1].trim();
          const module = namedMatch[2];
          return `const { ${names} } = require('${module}');`;
        }
        
        const namespaceMatch = importStmt.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"](.+)['"]/);
        if (namespaceMatch) {
          return `const ${namespaceMatch[1]} = require('${namespaceMatch[2]}');`;
        }
        
        return importStmt;
      }).join('\n');

      // Transpile TypeScript to JavaScript
      const transpileResult = ts.transpileModule(codeWithoutImports, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      });
      const jsCode = transpileResult.outputText.trim();

      // Execute the transpiled code with proper CommonJS module support
      const wrappedCode = `
        return (async function(require, module, exports) {
          ${requireStatements}
          
          // Execute the transpiled code
          ${jsCode}
          
          // Return module.exports (which might have been reassigned)
          return module.exports;
        })(require, module, exports);
      `;

      // Execute the code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const executableFunction = new AsyncFunction('require', 'module', 'exports', wrappedCode);
      
      // Create custom require function
      // Try to use organization-specific node_modules if available
      let customRequire: NodeRequire = require;
      try {
        const orgPackagesPath = packageManager.getNodeModulesPath(organizationId);
        const orgPackageJsonPath = path.join(orgPackagesPath, "..", "package.json");
        customRequire = Module.createRequire(orgPackageJsonPath);
      } catch {
        // Fallback to standard require
        customRequire = require;
      }
      
      // Create module and exports objects (CommonJS pattern)
      const exportsObj: any = {};
      const moduleObj = { exports: exportsObj };

      // Execute and get exports
      const result = await executableFunction(customRequire, moduleObj, exportsObj);
      
      // Return the result (module.exports after execution)
      return result && typeof result === 'object' ? result : {};
    } catch (error: any) {
      throw new Error(`Utilities execution failed: ${error.message}`);
    }
  }

  private async executeCodeNode(
    node: typeof nodes.$inferSelect,
    inputItems: ExecutionItem[],
    predecessorOutputs: Map<string, { nodeLabel: string; output: ExecutionItem[] }>,
    organizationId: string,
    typeDefinitions?: string,
    utilities?: Map<string, { label: string; exports: Record<string, any>; code: string }>
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

      // Generate utilities declarations
      let utilitiesDeclarations = '';
      if (utilities) {
        utilities.forEach((utilityData, utilityNodeId) => {
          const sanitizedLabel = utilityData.label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
          const varName = `$${sanitizedLabel}`;
          
          // Try to get function names from exports first
          let functionNames = Object.keys(utilityData.exports);
          
          // If exports is empty (during type-checking), extract from code
          if (functionNames.length === 0 && utilityData.code) {
            functionNames = this.extractFunctionNames(utilityData.code);
          }
          
          // Generate type declarations for each function
          const exportDeclarations = functionNames
            .map(fnName => `  ${fnName}: (...args: any[]) => any;`)
            .join('\n');
          
          utilitiesDeclarations += `declare const ${varName}: {\n${exportDeclarations}\n};\n`;
        });
      }

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
declare const $credentials: Record<string, any>;
${predecessorDeclarations}
${utilitiesDeclarations}
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

      // Load credentials for this organization
      const credentials = await credentialService.getCredentials(organizationId);

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
            const paramNames: string[] = ["$input", "console", "require", "$credentials"];
            const paramValues: unknown[] = [inputItems, safeConsole, customRequire, credentials];
            
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
            
            // Add utilities as parameters
            if (utilities) {
              utilities.forEach((utilityData, utilityNodeId) => {
                const sanitizedLabel = utilityData.label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
                const varName = `$${sanitizedLabel}`;
                
                paramNames.push(varName);
                paramValues.push(utilityData.exports);
              });
            }
            
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

  // ==================== NODE HANDLERS ====================

  private executeFilterNode(
    node: typeof nodes.$inferSelect,
    inputItems: ExecutionItem[]
  ): ExecutionItem[] {
    const config = node.config as {
      conditions?: Array<{ field: string; operator: string; value: string }>;
      combineWith?: "and" | "or";
    };

    if (!config?.conditions || config.conditions.length === 0) {
      return inputItems; // No conditions - pass through
    }

    const combineWith = config.combineWith || "and";

    return inputItems.filter(item => {
      const results = config.conditions!.map(condition => {
        const fieldValue = this.getNestedValue(item.json, condition.field);
        return this.evaluateCondition(fieldValue, condition.operator, condition.value);
      });

      if (combineWith === "and") {
        return results.every(r => r);
      } else {
        return results.some(r => r);
      }
    });
  }

  private evaluateCondition(fieldValue: unknown, operator: string, compareValue: string): boolean {
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

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private executeLimitNode(
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

  private executeRemoveDuplicatesNode(
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
        const value = this.getNestedValue(item.json, config.fieldToCompare);
        key = JSON.stringify(value);
      }

      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  }

  private executeSplitOutNode(
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
      const arrayValue = this.getNestedValue(item.json, config.fieldToSplit);

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

  private executeAggregateNode(
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
        this.getNestedValue(item.json, config.fieldToAggregate!)
      );
      return [{ json: { [outputField]: values } }];
    } else {
      const allData = inputItems.map(item => item.json);
      return [{ json: { [outputField]: allData } }];
    }
  }

  private executeMergeNode(
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
        // Items are already combined from multiple inputs
        return inputItems;

      case "combine":
        if (config?.combineMode === "mergeByPosition") {
          // Merge items at same positions
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
          // Merge items with matching keys
          const keyMap = new Map<string, Record<string, unknown>>();
          for (const item of inputItems) {
            const keyValue = String(this.getNestedValue(item.json, config.joinField!) ?? "");
            const existing = keyMap.get(keyValue) || {};
            keyMap.set(keyValue, { ...existing, ...item.json });
          }
          return Array.from(keyMap.values()).map(json => ({ json }));
        }
        return inputItems;

      case "chooseBranch":
        // Return first non-empty branch
        return inputItems.length > 0 ? [inputItems[0]] : [];

      case "multiplex":
        // All combinations
        return inputItems;

      default:
        return inputItems;
    }
  }

  private executeSummarizeNode(
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
        ? inputItems.map(item => this.getNestedValue(item.json, op.field!))
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

  private executeDateTimeNode(
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
        const dateValue = this.getNestedValue(item.json, config.inputField);
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
            ? this.formatDate(inputDate, config.format)
            : inputDate.toISOString();
          break;
        case "add":
        case "subtract":
          const multiplier = operation === "subtract" ? -1 : 1;
          const amount = (config?.amount || 0) * multiplier;
          result = this.addToDate(inputDate, amount, config?.unit || "days").toISOString();
          break;
        case "extract":
          result = this.extractFromDate(inputDate, config?.extractPart || "year");
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

  private formatDate(date: Date, format: string): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return format
      .replace("YYYY", date.getFullYear().toString())
      .replace("MM", pad(date.getMonth() + 1))
      .replace("DD", pad(date.getDate()))
      .replace("HH", pad(date.getHours()))
      .replace("mm", pad(date.getMinutes()))
      .replace("ss", pad(date.getSeconds()));
  }

  private addToDate(date: Date, amount: number, unit: string): Date {
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

  private extractFromDate(date: Date, part: string): number {
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

  private executeEditFieldsNode(
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

          this.setNestedValue(newJson, field.name, value);
        }
      }

      // Remove fields
      if (config?.removeFields) {
        for (const fieldPath of config.removeFields) {
          this.deleteNestedValue(newJson, fieldPath);
        }
      }

      // Rename fields
      if (config?.renameFields) {
        for (const rename of config.renameFields) {
          const value = this.getNestedValue(newJson, rename.from);
          if (value !== undefined) {
            this.deleteNestedValue(newJson, rename.from);
            this.setNestedValue(newJson, rename.to, value);
          }
        }
      }

      return { json: newJson };
    });
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
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

  private deleteNestedValue(obj: Record<string, unknown>, path: string): void {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) return;
      current = current[keys[i]] as Record<string, unknown>;
    }
    delete current[keys[keys.length - 1]];
  }

  private async executeHttpRequestNode(
    node: typeof nodes.$inferSelect,
    inputItems: ExecutionItem[]
  ): Promise<ExecutionItem[]> {
    const config = node.config as {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
      url?: string;
      headers?: Record<string, string>;
      body?: string;
      bodyType?: "json" | "form" | "raw";
      authentication?: "none" | "basic" | "bearer" | "apiKey";
      timeout?: number;
    };

    if (!config?.url) {
      throw new Error("HTTP Request node requires a URL");
    }

    const results: ExecutionItem[] = [];

    for (const item of inputItems) {
      try {
        // Replace placeholders in URL with item data
        let url = config.url;
        for (const [key, value] of Object.entries(item.json)) {
          url = url.replace(`{{${key}}}`, String(value));
        }

        const headers: Record<string, string> = { ...config.headers };

        let body: string | undefined;
        if (config.body && config.method !== "GET" && config.method !== "HEAD") {
          body = config.body;
          // Replace placeholders in body
          for (const [key, value] of Object.entries(item.json)) {
            body = body.replace(`{{${key}}}`, JSON.stringify(value));
          }

          if (config.bodyType === "json" && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
          }
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeout || 30000);

        const response = await fetch(url, {
          method: config.method || "GET",
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        let responseData: unknown;
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        results.push({
          json: {
            statusCode: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData,
          },
        });
      } catch (error) {
        results.push({
          json: {
            error: error instanceof Error ? error.message : String(error),
            input: item.json,
          },
        });
      }
    }

    return results;
  }

  private async executeWaitNode(
    node: typeof nodes.$inferSelect,
    inputItems: ExecutionItem[]
  ): Promise<ExecutionItem[]> {
    const config = node.config as {
      waitTime?: number;
      unit?: "seconds" | "minutes" | "hours" | "days";
    };

    const waitTime = config?.waitTime || 1;
    const unit = config?.unit || "seconds";

    let milliseconds = waitTime * 1000;
    switch (unit) {
      case "minutes": milliseconds = waitTime * 60 * 1000; break;
      case "hours": milliseconds = waitTime * 60 * 60 * 1000; break;
      case "days": milliseconds = waitTime * 24 * 60 * 60 * 1000; break;
    }

    // Cap at 5 minutes for safety
    milliseconds = Math.min(milliseconds, 5 * 60 * 1000);

    await new Promise(resolve => setTimeout(resolve, milliseconds));

    return inputItems;
  }

  private async executeSubworkflow(
    node: typeof nodes.$inferSelect,
    inputItems: ExecutionItem[],
    organizationId: string
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

    console.log(`Executing subworkflow ${subworkflowId} in mode: ${mode}`);

    try {
      if (mode === "once") {
        // Execute the subworkflow once with all input items
        const triggerData = {
          items: inputItems,
          json: inputItems.length > 0 ? inputItems[0].json : {},
        };

        const result = await this.executeWorkflow(
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

          console.log(`Executing subworkflow for item ${i + 1}/${inputItems.length}`);

          const result = await this.executeWorkflow(
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
}

export const workflowExecutor = new WorkflowExecutor();
