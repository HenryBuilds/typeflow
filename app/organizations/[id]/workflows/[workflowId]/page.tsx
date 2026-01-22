"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Play, Loader2, Code, Zap, Plus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, FileType, Package } from "lucide-react";
import { WorkflowEditor } from "@/components/workflow-editor";
import { NodeOutputPanel } from "@/components/node-output-panel";
import { TypeDefinitionsDialog } from "@/components/type-definitions-dialog";
import { PackagesDialog } from "@/components/packages-dialog";
import { useSaveWorkflow } from "@/hooks/use-workflows";
import { Node, Edge } from "reactflow";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;
  const workflowId = params.workflowId as string;

  const {
    data: workflow,
    isLoading,
    error,
  } = trpc.workflows.getById.useQuery(
    { organizationId: organizationId, id: workflowId },
    {
      enabled: !!workflowId && !!organizationId,
      retry: false,
    }
  );

  // Get installed packages for type definitions
  const { data: installedPackages } = trpc.packages.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const [editorData, setEditorData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [typeDefinitionsOpen, setTypeDefinitionsOpen] = useState(false);
  const [packagesDialogOpen, setPackagesDialogOpen] = useState(false);
  const [nodeOutputs, setNodeOutputs] = useState<Record<
    string,
    {
      status: "pending" | "running" | "completed" | "failed";
      output?: unknown;
      error?: string;
      duration?: number;
    }
  >>({});
  const saveMutation = useSaveWorkflow(organizationId);
  const runMutation = trpc.executions.run.useMutation();
  const runUntilNodeMutation = trpc.executions.runUntilNode.useMutation();
  const getNodesRef = useRef<(() => Node[]) | null>(null);
  const getEdgesRef = useRef<(() => Edge[]) | null>(null);
  const utils = trpc.useUtils();

  const handleExecuteNode = useCallback((nodeId: string) => {
    if (!workflow) return;

    setExecutingNodeId(nodeId);
    
    runUntilNodeMutation.mutate(
      {
        organizationId: organizationId,
        workflowId: workflow.id,
        nodeId: nodeId,
        triggerData: {},
      },
      {
        onSuccess: (result) => {
          console.log("Node execution result:", result);
          // Update node outputs with execution results
          if (result.nodeResults) {
            const formattedOutputs: Record<
              string,
              {
                status: "pending" | "running" | "completed" | "failed";
                output?: unknown;
                error?: string;
                duration?: number;
              }
            > = {};
            Object.entries(result.nodeResults).forEach(([nodeId, nodeResult]) => {
              formattedOutputs[nodeId] = {
                status: nodeResult.status,
                output: nodeResult.output,
                error: nodeResult.error,
                duration: nodeResult.duration,
              };
            });
            setNodeOutputs(formattedOutputs);
          }
          setExecutingNodeId(null);
          // Select the executed node to show its output
          setSelectedNodeId(nodeId);
        },
        onError: (error) => {
          console.error("Node execution error:", error);
          
          // Set error status on the node instead of showing alert
          setNodeOutputs((prev) => ({
            ...prev,
            [nodeId]: {
              status: "failed",
              error: error.message,
            },
          }));
          
          setExecutingNodeId(null);
        },
      }
    );
  }, [workflow, runUntilNodeMutation, organizationId]);

  const handleSaveTypeDefinitions = useCallback((types: string) => {
    if (!workflow) return;

    const updatedMetadata = {
      ...workflow.metadata,
      typeDefinitions: types,
    };

    saveMutation.mutate(
      {
        organizationId: organizationId,
        workflowId: workflow.id,
        workflow: {
          name: workflow.name,
          description: workflow.description || undefined,
          version: workflow.version,
          metadata: updatedMetadata,
        },
        nodes: (workflow.nodes || []).map((node) => ({
          id: node.id,
          type: node.type || "workflow",
          label: node.label || "Node",
          position: node.position,
          config: node.config || {},
          executionOrder: node.executionOrder || 0,
        })),
        connections: (workflow.connections || []).map((edge) => ({
          id: edge.id || undefined,
          sourceNodeId: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined,
        })),
      },
      {
        onSuccess: async () => {
          await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
          await utils.workflows.getById.refetch({ organizationId, id: workflowId });
        },
        onError: (error) => {
          console.error("Error saving type definitions:", error);
          alert(`Error saving type definitions: ${error.message}`);
        },
      }
    );
  }, [workflow, saveMutation, organizationId, workflowId, utils]);

  const handleSave = useCallback(() => {
    if (!workflow) {
      return;
    }

    // Get current nodes and edges from editor
    const currentNodes = getNodesRef.current?.() || [];
    const currentEdges = getEdgesRef.current?.() || [];

    saveMutation.mutate(
      {
        organizationId: organizationId,
        workflowId: workflow.id,
        workflow: {
          name: workflow.name,
          description: workflow.description || undefined,
          version: workflow.version,
          metadata: workflow.metadata || undefined,
        },
        nodes: currentNodes.map((node) => ({
          id: node.id,
          type: node.type || "workflow",
          label: node.data.label || "Node",
          position: node.position,
          config: node.data.config || {},
          executionOrder: 0,
        })),
        connections: currentEdges.map((edge) => ({
          id: edge.id || undefined,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined,
        })),
      },
      {
        onSuccess: async () => {
          // Invalidate and refetch workflow data to show updated nodes
          await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
          await utils.workflows.getById.refetch({ organizationId, id: workflowId });
        },
        onError: (error) => {
          console.error("Error saving workflow:", error);
          alert(`Error saving workflow: ${error.message}`);
        },
      }
    );
  }, [workflow, saveMutation]);

  // Handle Ctrl+S / Cmd+S to save workflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field, textarea, or CodeMirror editor
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest(".cm-editor") ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleSave]);

  // Initialize editorData when workflow loads
  useEffect(() => {
    if (workflow && !editorData) {
      setEditorData({
        nodes: (workflow.nodes || []).map((node) => ({
          id: node.id,
          type: node.type || "workflow",
          position: node.position,
          data: {
            label: node.label,
            config: node.config || {},
          },
        })),
        edges: (workflow.connections || []).map((conn) => ({
          id: conn.id,
          source: conn.sourceNodeId,
          target: conn.targetNodeId,
          sourceHandle: conn.sourceHandle || undefined,
          targetHandle: conn.targetHandle || undefined,
        })),
      });
    }
  }, [workflow, editorData]);

  useEffect(() => {
    if (error) {
      console.error("Workflow fetch error:", error);
      if (error.data?.code === "UNAUTHORIZED") {
        router.push("/login");
      } else if (error.data?.code === "NOT_FOUND" || error.message === "Workflow not found") {
        router.push(`/organizations/${organizationId}`);
      }
    }
  }, [error, router, organizationId]);

  if (error && error.data?.code !== "UNAUTHORIZED" && error.data?.code !== "NOT_FOUND") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Error loading workflow</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Link href={`/organizations/${organizationId}`}>
            <Button variant="outline">Go Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !workflow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/organizations/${organizationId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-sm text-muted-foreground">
                {workflow.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTypeDefinitionsOpen(true)}
            title="Manage TypeScript type definitions"
          >
            <FileType className="h-4 w-4 mr-2" />
            Types
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPackagesDialogOpen(true)}
            title="Manage npm packages"
          >
            <Package className="h-4 w-4 mr-2" />
            Packages
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (workflow) {
                runMutation.mutate(
                  {
                    organizationId: organizationId,
                    workflowId: workflow.id,
                    triggerData: {},
                  },
                  {
                    onSuccess: (result) => {
                      console.log("Execution result received:", result);
                      console.log("Node results:", result.nodeResults);
                      // Update node outputs with execution results
                      if (result.nodeResults) {
                        // Convert nodeResults to the expected format
                        const formattedOutputs: Record<
                          string,
                          {
                            status: "pending" | "running" | "completed" | "failed";
                            output?: unknown;
                            error?: string;
                            duration?: number;
                          }
                        > = {};
                        Object.entries(result.nodeResults).forEach(([nodeId, nodeResult]) => {
                          formattedOutputs[nodeId] = {
                            status: nodeResult.status,
                            output: nodeResult.output,
                            error: nodeResult.error,
                            duration: nodeResult.duration,
                          };
                        });
                        console.log("Formatted outputs:", formattedOutputs);
                        setNodeOutputs(formattedOutputs);
                      }
                      if (result.status !== "completed") {
                        alert(`Workflow failed: ${result.error}`);
                      }
                    },
                    onError: (error) => {
                      console.error("Execution error:", error);
                      alert(`Error: ${error.message}`);
                    },
                  }
                );
              }
            }}
            disabled={runMutation.isPending || !workflow}
          >
            <Play className="h-4 w-4 mr-2" />
            {runMutation.isPending ? "Running..." : "Run"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending || !editorData}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Node Palette Sidebar */}
        <div 
          className={`border-r bg-muted/50 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
            leftSidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          <div className="w-64 h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Add Nodes</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent border hover:border-border"
                onClick={() => setLeftSidebarOpen(false)}
                title="Close sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", "trigger");
                  }}
                  className="p-3 rounded-md border bg-background hover:bg-accent cursor-move transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Trigger</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start your workflow
                  </p>
                </div>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", "code");
                  }}
                  className="p-3 rounded-md border bg-background hover:bg-accent cursor-move transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <span className="text-sm font-medium">Code Node</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Execute TypeScript code
                  </p>
                </div>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", "workflow");
                  }}
                  className="p-3 rounded-md border bg-background hover:bg-accent cursor-move transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Generic Node</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Basic workflow node
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle button when left sidebar is closed */}
        {!leftSidebarOpen && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-start pt-4">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-12 w-10 rounded-r-md rounded-l-none shadow-lg hover:shadow-xl transition-all"
              onClick={() => setLeftSidebarOpen(true)}
              title="Open sidebar"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            <WorkflowEditor
              workflow={workflow as any}
              getNodesRef={getNodesRef}
              getEdgesRef={getEdgesRef}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onExecuteNode={handleExecuteNode}
              executingNodeId={executingNodeId}
              typeDefinitions={(workflow?.metadata as { typeDefinitions?: string })?.typeDefinitions}
              packageTypeDefinitions={installedPackages?.map(pkg => pkg.typeDefinitions).filter(Boolean).join('\n\n')}
              nodeOutputs={nodeOutputs}
            />
          </div>

          {/* Right Sidebar - Node Output */}
          <div 
            className={`border-l bg-background transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
              rightSidebarOpen ? 'w-96' : 'w-0'
            }`}
          >
            <div className="w-96 h-full">
              <NodeOutputPanel
                selectedNodeId={selectedNodeId}
                nodeOutputs={nodeOutputs}
                onClose={() => setRightSidebarOpen(false)}
              />
            </div>
          </div>

          {/* Toggle button when right sidebar is closed */}
          {!rightSidebarOpen && (
            <div className="absolute right-0 top-0 bottom-0 z-10 flex items-start pt-4">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-12 w-10 rounded-l-md rounded-r-none shadow-lg hover:shadow-xl transition-all"
                onClick={() => setRightSidebarOpen(true)}
                title="Open output panel"
              >
                <PanelRightOpen className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Type Definitions Dialog */}
      <TypeDefinitionsDialog
        open={typeDefinitionsOpen}
        onOpenChange={setTypeDefinitionsOpen}
        initialTypes={(workflow?.metadata as { typeDefinitions?: string })?.typeDefinitions || ""}
        onSave={handleSaveTypeDefinitions}
      />

      {/* Packages Dialog */}
      <PackagesDialog
        open={packagesDialogOpen}
        onOpenChange={setPackagesDialogOpen}
        organizationId={organizationId}
      />
    </div>
  );
}
