"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { CodeNode } from "./nodes/code-node";
import { TriggerNode } from "./nodes/trigger-node";
import { WorkflowNode } from "./nodes/workflow-node";
import { WebhookNode } from "./nodes/webhook-node";
import { WebhookResponseNode } from "./nodes/webhook-response-node";
import { UtilitiesNode } from "./nodes/utilities-node";
import { CodeEditorDialog } from "./code-editor-dialog";

const nodeTypes: NodeTypes = {
  code: CodeNode,
  trigger: TriggerNode,
  workflow: WorkflowNode,
  webhook: WebhookNode,
  webhookResponse: WebhookResponseNode,
  utilities: UtilitiesNode,
};

interface WorkflowEditorProps {
  organizationId?: string; // Organization ID for loading credentials
  workflow: {
    id: string;
    name: string;
    isActive?: boolean; // Whether the workflow is active
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      position: { x: number; y: number };
      config?: Record<string, unknown> | null;
      executionOrder?: number;
    }>;
    connections: Array<{
      id: string;
      sourceNodeId: string;
      targetNodeId: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }>;
    metadata?: {
      viewport?: { x: number; y: number; zoom: number };
    };
  };
  onSave?: (data: {
    nodes: Node[];
    edges: Edge[];
  }) => void;
  getNodesRef?: React.MutableRefObject<(() => Node[]) | null>;
  getEdgesRef?: React.MutableRefObject<(() => Edge[]) | null>;
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string | null) => void;
  onExecuteNode?: (nodeId: string) => void;
  executingNodeId?: string | null;
  typeDefinitions?: string;
  packageTypeDefinitions?: string; // Combined type definitions from packages
  installedPackages?: Array<{ name: string; version: string }>; // List of installed packages
  nodeOutputs?: Record<
    string,
    {
      status: "pending" | "running" | "completed" | "failed";
      output?: unknown;
      error?: string;
      duration?: number;
    }
  >;
  onWebhookEdit?: (nodeId: string, node: Node) => void; // Callback for webhook node edit
}

export function WorkflowEditor({ 
  organizationId,
  workflow, 
  onSave, 
  getNodesRef, 
  getEdgesRef,
  selectedNodeId,
  onNodeSelect,
  onExecuteNode,
  executingNodeId,
  typeDefinitions,
  packageTypeDefinitions,
  installedPackages = [],
  nodeOutputs,
  onWebhookEdit,
}: WorkflowEditorProps) {
  // Debug logging
  useEffect(() => {
    console.log('WorkflowEditor received typeDefinitions:', typeDefinitions ? typeDefinitions.substring(0, 100) + '...' : 'empty/undefined');
  }, [typeDefinitions]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  // Convert database nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(
    () =>
      (workflow.nodes || []).map((node) => ({
        id: node.id,
        type: node.type || "workflow",
        position: node.position,
        data: {
          label: node.label,
          config: node.config || {},
        },
      })),
    [workflow.nodes]
  );

  // Convert database connections to React Flow edges
  const initialEdges: Edge[] = useMemo(
    () =>
      (workflow.connections || []).map((conn) => ({
        id: conn.id,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourceHandle || undefined,
        targetHandle: conn.targetHandle || undefined,
      })),
    [workflow.connections]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Style edges based on execution status
  const styledEdges = useMemo(() => {
    return edges.map(edge => {
      const sourceStatus = nodeOutputs?.[edge.source]?.status;
      const targetStatus = nodeOutputs?.[edge.target]?.status;
      
      // Both nodes completed - green edge
      if (sourceStatus === "completed" && targetStatus === "completed") {
        return {
          ...edge,
          animated: true,
          style: { stroke: '#22c55e', strokeWidth: 2 },
        };
      }
      
      // Source completed, target running - blue animated edge
      if (sourceStatus === "completed" && targetStatus === "running") {
        return {
          ...edge,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
        };
      }
      
      // Source completed - green edge
      if (sourceStatus === "completed") {
        return {
          ...edge,
          style: { stroke: '#22c55e', strokeWidth: 2 },
        };
      }
      
      // Failed - red edge
      if (sourceStatus === "failed" || targetStatus === "failed") {
        return {
          ...edge,
          style: { stroke: '#ef4444', strokeWidth: 2 },
        };
      }
      
      return edge;
    });
  }, [edges, nodeOutputs]);

  // Update nodes and edges when workflow changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Calculate distance between nodes (number of edges)
  const calculateNodeDistance = useCallback((fromNodeId: string, toNodeId: string): number => {
    if (fromNodeId === toNodeId) return 0;
    
    // BFS to find shortest path
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: fromNodeId, distance: 0 }];
    
    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;
      
      if (nodeId === toNodeId) {
        return distance;
      }
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      // Find all nodes connected from this node
      const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
      outgoingEdges.forEach((edge) => {
        if (!visited.has(edge.target)) {
          queue.push({ nodeId: edge.target, distance: distance + 1 });
        }
      });
    }
    
    return Infinity; // No path found
  }, [edges]);

  // Find all predecessor nodes (all nodes that come before this node in the workflow)
  const findAllPredecessorNodes = useCallback((nodeId: string): Set<string> => {
    const predecessors = new Set<string>();
    const visited = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);
      
      // Find all edges that target this node
      const incomingEdges = edges.filter((edge) => edge.target === currentNodeId);
      incomingEdges.forEach((edge) => {
        if (!visited.has(edge.source)) {
          predecessors.add(edge.source);
          queue.push(edge.source);
        }
      });
    }
    
    return predecessors;
  }, [edges]);

  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  // Add onEdit handler to code nodes and pass input data from connected nodes
  const nodesWithHandlers = useMemo(() => {
    return nodes.map((node) => {
      // Find ALL predecessor nodes, not just directly connected ones
      const predecessorIds = findAllPredecessorNodes(node.id);
      
      // Find edges that directly connect to this node
      const directIncomingEdges = edges.filter((edge) => edge.target === node.id);
      const directPredecessorIds = new Set(directIncomingEdges.map(edge => edge.source));
      
      // Get output from all predecessor nodes with distance information
      const inputData: Array<{ 
        sourceNodeId: string; 
        output: unknown;
        distance: number;
        sourceNodeLabel: string;
      }> = [];
      
      predecessorIds.forEach((predecessorId) => {
        const sourceOutput = nodeOutputs?.[predecessorId];
        if (sourceOutput?.output !== undefined) {
          const sourceNode = nodes.find(n => n.id === predecessorId);
          // Distance is 1 for directly connected nodes, otherwise calculate
          const distance = directPredecessorIds.has(predecessorId) 
            ? 1 
            : calculateNodeDistance(predecessorId, node.id);
          inputData.push({
            sourceNodeId: predecessorId,
            output: sourceOutput.output,
            distance,
            sourceNodeLabel: sourceNode?.data?.label || `Node ${predecessorId.substring(0, 8)}`,
          });
        }
      });

      // Try to find execution status by node ID first, then fallback to label matching
      let executionStatus = nodeOutputs?.[node.id]?.status;
      let errorMessage = nodeOutputs?.[node.id]?.error;

      // If no match by ID, try matching by label
      if (!executionStatus && nodeOutputs && Object.keys(nodeOutputs).length > 0) {
        const nodeLabel = node.data?.label;
        if (nodeLabel) {
          const matchingEntry = Object.entries(nodeOutputs).find(
            ([_, result]) => (result as any).nodeLabel === nodeLabel
          );
          if (matchingEntry) {
            executionStatus = matchingEntry[1].status;
            errorMessage = matchingEntry[1].error;
          }
        }
      }

      // Debug: Log node ID matching
      if (nodeOutputs && Object.keys(nodeOutputs).length > 0) {
        console.log(`Node "${node.data?.label}" (${node.id}): executionStatus=${executionStatus}, nodeOutputs keys=`, Object.keys(nodeOutputs));
      }

      if (node.type === "code") {
        return {
          ...node,
          data: {
            ...node.data,
            onEdit: (nodeId: string) => {
              setEditingNodeId(nodeId);
              setEditingNode(node);
            },
            onExecute: onExecuteNode,
            onDelete: handleDeleteNode,
            isExecuting: executingNodeId === node.id,
            executionStatus,
            errorMessage,
            inputData, // Pass input data to node
          },
        };
      }
      if (node.type === "webhook") {
        // Only show webhook URL when workflow is active and path is configured
        const webhookUrl = workflow.isActive && node.data.config?.path
          ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/${organizationId}/${node.data.config.path}`
          : undefined;

        return {
          ...node,
          data: {
            ...node.data,
            onEdit: (nodeId: string) => {
              if (onWebhookEdit) {
                onWebhookEdit(nodeId, node);
              } else {
                setEditingNodeId(nodeId);
                setEditingNode(node);
              }
            },
            onDelete: handleDeleteNode,
            isExecuting: executingNodeId === node.id,
            executionStatus,
            errorMessage,
            webhookUrl,
            isWorkflowActive: workflow.isActive,
          },
        };
      }
      if (node.type === "webhookResponse") {
        return {
          ...node,
          data: {
            ...node.data,
            onEdit: (nodeId: string) => {
              setEditingNodeId(nodeId);
              setEditingNode(node);
            },
            onExecute: onExecuteNode,
            onDelete: handleDeleteNode,
            isExecuting: executingNodeId === node.id,
            executionStatus,
            errorMessage,
            inputData,
          },
        };
      }
      if (node.type === "utilities") {
        return {
          ...node,
          data: {
            ...node.data,
            onEdit: (nodeId: string) => {
              setEditingNodeId(nodeId);
              setEditingNode(node);
            },
            onExecute: onExecuteNode,
            onDelete: handleDeleteNode,
            isExecuting: executingNodeId === node.id,
            executionStatus,
            errorMessage,
          },
        };
      }
      return {
        ...node,
        data: {
          ...node.data,
          onExecute: onExecuteNode,
          onDelete: handleDeleteNode,
          isExecuting: executingNodeId === node.id,
          executionStatus,
          errorMessage,
          inputData, // Also pass to other node types
        },
      };
    });
  }, [nodes, edges, nodeOutputs, findAllPredecessorNodes, calculateNodeDistance, onExecuteNode, executingNodeId, handleDeleteNode, organizationId, workflow.isActive, onWebhookEdit]);

  const handleCodeSave = useCallback(
    (data: { code: string; label: string }) => {
      if (!editingNodeId) return;

      // Check if label is unique (case-insensitive)
      const labelLower = data.label.trim().toLowerCase();
      const isDuplicate = nodes.some(
        (node) => 
          node.id !== editingNodeId && 
          node.data?.label?.toString().trim().toLowerCase() === labelLower
      );

      if (isDuplicate) {
        alert(`Node name "${data.label}" already exists. Please choose a unique name.`);
        return;
      }

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: data.label.trim(),
                config: {
                  ...node.data.config,
                  code: data.code,
                },
              },
            };
          }
          return node;
        })
      );

      setEditingNodeId(null);
      setEditingNode(null);
    },
    [editingNodeId, nodes, setNodes]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Helper function to generate unique label
  const generateUniqueLabel = useCallback((baseLabel: string, existingNodes: Node[]): string => {
    const existingLabels = new Set(
      existingNodes.map(n => n.data?.label?.toString().trim().toLowerCase()).filter(Boolean)
    );
    
    let label = baseLabel;
    let counter = 1;
    
    while (existingLabels.has(label.toLowerCase())) {
      counter++;
      label = `${baseLabel} ${counter}`;
    }
    
    return label;
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const baseLabel = type === "trigger" ? "Trigger" : type === "code" ? "Code Node" : type === "webhook" ? "Webhook" : type === "webhookResponse" ? "Webhook Response" : type === "utilities" ? "Utilities" : "Node";
      const uniqueLabel = generateUniqueLabel(baseLabel, nodes);

      // Generate a proper UUID for the node
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const newNode: Node = {
        id: generateUUID(),
        type,
        position,
        data: {
          label: uniqueLabel,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes, generateUniqueLabel, setNodes]
  );

  // Expose nodes/edges via refs for parent to access (update on every render)
  // Update refs so parent can access current nodes/edges
  // Set them directly (not in useEffect) to ensure they're always up to date
  if (getNodesRef) {
    getNodesRef.current = () => nodes;
  }
  if (getEdgesRef) {
    getEdgesRef.current = () => edges;
  }

  return (
    <>
      <div className="w-full h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, node) => {
            if (onNodeSelect) {
              onNodeSelect(selectedNodeId === node.id ? null : node.id);
            }
          }}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Controls />
          <MiniMap 
            style={{
              height: 100,
              width: 150,
            }}
            zoomable
            pannable
            nodeStrokeWidth={3}
            maskColor="rgba(0, 0, 0, 0.6)"
          />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
      {editingNode && editingNodeId && (editingNode.type === "code" || editingNode.type === "webhookResponse" || editingNode.type === "utilities") && (() => {
        // Get the latest node data with inputData from nodesWithHandlers
        const latestNode = nodesWithHandlers.find(n => n.id === editingNodeId);
        const nodeInputData = latestNode?.data?.inputData || editingNode.data.inputData;

        // Build map of source node IDs to labels
        const sourceNodeLabels: Record<string, string> = {};
        if (nodeInputData && Array.isArray(nodeInputData)) {
          nodeInputData.forEach((input: { sourceNodeId?: string; output?: unknown; distance?: number; sourceNodeLabel?: string }) => {
            if (input.sourceNodeId && !sourceNodeLabels[input.sourceNodeId]) {
              const sourceNode = nodes.find(n => n.id === input.sourceNodeId);
              sourceNodeLabels[input.sourceNodeId] = sourceNode?.data?.label || `Node ${input.sourceNodeId.substring(0, 8)}`;
            }
          });
        }
        
        const defaultLabel = editingNode.type === "webhookResponse" ? "Webhook Response" : editingNode.type === "utilities" ? "Utilities" : "Code Node";
        
        // Extract utilities from all utilities nodes
        const utilities = nodes
          .filter(n => n.type === "utilities" && n.data?.config?.code)
          .map(n => {
            const code = n.data.config.code as string;
            const label = n.data.label || "Utilities";
            
            // Parse the code to extract exported function names
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
              return { label, functions: exportedNames.length > 0 ? exportedNames : functions };
            }
            
            return { label, functions };
          })
          .filter(u => u.functions.length > 0);
        
        return (
          <CodeEditorDialog
            open={!!editingNodeId}
            onOpenChange={(open) => {
              if (!open) {
                setEditingNodeId(null);
                setEditingNode(null);
              }
            }}
            nodeId={editingNodeId || ""}
            organizationId={organizationId}
            initialCode={(editingNode.data.config?.code as string) || ""}
            initialLabel={editingNode.data.label || defaultLabel}
            inputData={nodeInputData}
            sourceNodeLabels={sourceNodeLabels}
            typeDefinitions={typeDefinitions}
            packageTypeDefinitions={packageTypeDefinitions}
            installedPackages={installedPackages}
            existingNodeLabels={nodes
              .filter(n => n.id !== editingNodeId)
              .map(n => n.data?.label?.toString().trim())
              .filter(Boolean) as string[]}
            utilities={utilities}
            onSave={handleCodeSave}
          />
        );
      })()}
    </>
  );
}

