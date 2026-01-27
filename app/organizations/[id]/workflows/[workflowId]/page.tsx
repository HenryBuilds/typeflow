"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Play, Loader2, Code, Zap, Plus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, FileType, Package, Webhook, Send, Bug, Download, Eye, Wrench, Power, Copy, Check, History, GitBranch, Upload, Filter, ArrowDown, SplitSquareVertical, ListPlus, GitMerge, Calculator, Clock, PenLine, Globe, Timer, ArrowRight, MousePointer, MessageSquare } from "lucide-react";
import { WorkflowEditor } from "@/components/workflow-editor";
import { NodeOutputPanel } from "@/components/node-output-panel";
import { WorkflowLogPanel, WorkflowLog } from "@/components/workflow-log-panel";
import { TypeDefinitionsDialog } from "@/components/type-definitions-dialog";
import { PackagesDialog } from "@/components/packages-dialog";
import { WebhookDialog } from "@/components/webhook-dialog";
import { ExecutionsPanel } from "@/components/executions-panel";
import { ExecuteWorkflowDialog } from "@/components/execute-workflow-dialog";
import { WorkflowInputDialog } from "@/components/workflow-input-dialog";
import { WorkflowOutputDialog } from "@/components/workflow-output-dialog";
import {
  FilterNodeDialog,
  LimitNodeDialog,
  WaitNodeDialog,
  DateTimeNodeDialog,
  AggregateNodeDialog,
  MergeNodeDialog,
  SplitOutNodeDialog,
  RemoveDuplicatesNodeDialog,
  SummarizeNodeDialog,
  EditFieldsNodeDialog,
  HttpRequestNodeDialog,
} from "@/components/nodes/dialogs";
import { useSaveWorkflow } from "@/hooks/use-workflows";
import { DebugToolbar } from "@/components/debug-toolbar";
import { DebugPanel } from "@/components/debug-panel";
import { useDebug } from "@/hooks/use-debug";
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
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [editingWebhookNode, setEditingWebhookNode] = useState<Node | null>(null);
  const [executeWorkflowDialogOpen, setExecuteWorkflowDialogOpen] = useState(false);
  const [editingExecuteWorkflowNode, setEditingExecuteWorkflowNode] = useState<Node | null>(null);
  const [workflowInputDialogOpen, setWorkflowInputDialogOpen] = useState(false);
  const [editingWorkflowInputNode, setEditingWorkflowInputNode] = useState<Node | null>(null);
  const [workflowOutputDialogOpen, setWorkflowOutputDialogOpen] = useState(false);
  const [editingWorkflowOutputNode, setEditingWorkflowOutputNode] = useState<Node | null>(null);
  // Data transformation node dialogs
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [editingFilterNode, setEditingFilterNode] = useState<Node | null>(null);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [editingLimitNode, setEditingLimitNode] = useState<Node | null>(null);
  const [waitDialogOpen, setWaitDialogOpen] = useState(false);
  const [editingWaitNode, setEditingWaitNode] = useState<Node | null>(null);
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = useState(false);
  const [editingDateTimeNode, setEditingDateTimeNode] = useState<Node | null>(null);
  const [aggregateDialogOpen, setAggregateDialogOpen] = useState(false);
  const [editingAggregateNode, setEditingAggregateNode] = useState<Node | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [editingMergeNode, setEditingMergeNode] = useState<Node | null>(null);
  const [splitOutDialogOpen, setSplitOutDialogOpen] = useState(false);
  const [editingSplitOutNode, setEditingSplitOutNode] = useState<Node | null>(null);
  const [removeDuplicatesDialogOpen, setRemoveDuplicatesDialogOpen] = useState(false);
  const [editingRemoveDuplicatesNode, setEditingRemoveDuplicatesNode] = useState<Node | null>(null);
  const [summarizeDialogOpen, setSummarizeDialogOpen] = useState(false);
  const [editingSummarizeNode, setEditingSummarizeNode] = useState<Node | null>(null);
  const [editFieldsDialogOpen, setEditFieldsDialogOpen] = useState(false);
  const [editingEditFieldsNode, setEditingEditFieldsNode] = useState<Node | null>(null);
  const [httpRequestDialogOpen, setHttpRequestDialogOpen] = useState(false);
  const [editingHttpRequestNode, setEditingHttpRequestNode] = useState<Node | null>(null);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [logPanelCollapsed, setLogPanelCollapsed] = useState(false); // Start expanded by default so it's visible
  const [nodeOutputs, setNodeOutputs] = useState<Record<
    string,
    {
      status: "pending" | "running" | "completed" | "failed";
      output?: unknown;
      error?: string;
      duration?: number;
    }
  >>({});
  const [urlCopied, setUrlCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "executions">("editor");
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [executionNodeOutputs, setExecutionNodeOutputs] = useState<Record<
    string,
    {
      status: "pending" | "running" | "completed" | "failed";
      output?: unknown;
      error?: string;
      duration?: number;
    }
  > | null>(null);
  
  const webhookNode = workflow?.nodes.find((n) => n.type === "webhook");
  const webhookPath = webhookNode?.config?.path as string | undefined;
  const webhookUrl = webhookPath
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/${organizationId}/${webhookPath}`
    : null;

  const handleCopyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    }
  };

  const saveMutation = useSaveWorkflow(organizationId);
  const runMutation = trpc.executions.run.useMutation();
  const runUntilNodeMutation = trpc.executions.runUntilNode.useMutation();
  const updateWorkflowMutation = trpc.workflows.update.useMutation();
  const getNodesRef = useRef<(() => Node[]) | null>(null);
  const getEdgesRef = useRef<(() => Edge[]) | null>(null);
  const utils = trpc.useUtils();

  // Debug hook
  const {
    debugState,
    breakpoints,
    isDebugging,
    isPaused,
    currentNodeId: debugCurrentNodeId,
    startDebug,
    stepOver,
    continueExecution,
    stopDebug,
    toggleBreakpoint,
    isStarting,
    isStepping,
    isContinuing,
    isStopping,
  } = useDebug(workflowId, organizationId);

  const addLog = useCallback((log: Omit<WorkflowLog, "timestamp">) => {
    setWorkflowLogs((prev) => [...prev, { ...log, timestamp: new Date() }]);
  }, []);

  const handleExecuteNode = useCallback((nodeId: string) => {
    if (!workflow) return;

    setExecutingNodeId(nodeId);
    addLog({ level: "info", message: `Starting execution until node ${nodeId}` });
    
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
          const isSuccess = result.status === "completed";
          addLog({ 
            level: isSuccess ? "success" : "error", 
            message: isSuccess ? "Execution completed successfully" : "Execution failed",
          });
          
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
              const node = workflow.nodes.find(n => n.id === nodeId);
              const nodeLabel = node?.label || `Node ${nodeId.substring(0, 8)}`;
              
              if (nodeResult.status === "completed") {
                addLog({
                  level: "success",
                  nodeId,
                  nodeLabel,
                  message: `Completed in ${nodeResult.duration}ms`,
                });
              } else if (nodeResult.status === "failed") {
                addLog({
                  level: "error",
                  nodeId,
                  nodeLabel,
                  message: nodeResult.error || "Unknown error",
                });
              }
              
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
          addLog({
            level: "error",
            nodeId,
            message: `Execution failed: ${error.message}`,
          });
          
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

  const handleWebhookTestFlow = useCallback((testData: Record<string, unknown>) => {
    if (!workflow) return;

    addLog({ level: "info", message: `Testing webhook flow with received data` });
    setExecutingNodeId(workflow.nodes[0]?.id || "");
    
    runMutation.mutate(
      {
        organizationId: organizationId,
        workflowId: workflow.id,
        triggerData: testData,
      },
      {
        onSuccess: (result) => {
          console.log("Test flow execution result:", result);
          
          // Check if execution was successful by checking status
          const isSuccess = result.status === "completed";
          
          addLog({ 
            level: isSuccess ? "success" : "error", 
            message: isSuccess ? "Test flow completed successfully" : `Test flow failed: ${result.error}`,
          });
          
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
              const node = workflow.nodes.find(n => n.id === nodeId);
              const nodeLabel = node?.label || `Node ${nodeId.substring(0, 8)}`;
              
              if (nodeResult.status === "completed") {
                addLog({
                  level: "success",
                  nodeId,
                  nodeLabel,
                  message: `Completed in ${nodeResult.duration}ms`,
                });
              } else if (nodeResult.status === "failed") {
                addLog({
                  level: "error",
                  nodeId,
                  nodeLabel,
                  message: nodeResult.error || "Unknown error",
                });
              }
              
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
          setExecutingNodeId(null);
        },
        onError: (error) => {
          console.error("Test flow error:", error);
          addLog({ level: "error", message: `Test flow failed: ${error.message}` });
          setExecutingNodeId(null);
        },
      }
    );
  }, [workflow, runMutation, organizationId, addLog]);

  const handleSaveTypeDefinitions = useCallback(async (types: string) => {
    if (!workflow) return;

    console.log('handleSaveTypeDefinitions called');
    console.log('Received types parameter:', typeof types, 'length:', types?.length);
    console.log('Received types content preview:', types ? types.substring(0, 200) : 'UNDEFINED OR NULL');
    console.log('Saving type definitions:', types ? types.substring(0, 100) + '...' : 'EMPTY');

    const updatedMetadata = {
      ...workflow.metadata,
      typeDefinitions: types,
    };

    console.log('Current workflow.metadata:', workflow.metadata);
    console.log('Updated metadata:', updatedMetadata);
    console.log('Updated metadata.typeDefinitions length:', updatedMetadata.typeDefinitions?.length);

    return new Promise<void>((resolve, reject) => {
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
            console.log('Type definitions saved successfully, refreshing data...');
            await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
            await utils.workflows.getById.refetch({ organizationId, id: workflowId });
            console.log('Refreshed workflow data');
            resolve();
          },
          onError: (error) => {
            console.error("Error saving type definitions:", error);
            alert(`Error saving type definitions: ${error.message}`);
            reject(error);
          },
        }
      );
    });
  }, [workflow, saveMutation, organizationId, workflowId, utils]);

  const handleToggleActive = useCallback(() => {
    if (!workflow) return;

    const newActiveState = !workflow.isActive;

    updateWorkflowMutation.mutate(
      {
        organizationId: organizationId,
        id: workflow.id,
        isActive: newActiveState,
      },
      {
        onSuccess: async () => {
          addLog({
            level: "info",
            message: `Workflow ${newActiveState ? "activated" : "deactivated"}`,
          });
          await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
          await utils.workflows.getById.refetch({ organizationId, id: workflowId });
        },
        onError: (error) => {
          console.error("Error toggling workflow active state:", error);
          alert(`Error: ${error.message}`);
        },
      }
    );
  }, [workflow, updateWorkflowMutation, organizationId, workflowId, utils, addLog]);

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

  // Debug functions
  const exportWorkflowJSON = useCallback(() => {
    const currentNodes = getNodesRef.current?.() || [];
    const currentEdges = getEdgesRef.current?.() || [];
    
    const exportData = {
      workflow: {
        id: workflow?.id,
        name: workflow?.name,
        description: workflow?.description,
        metadata: workflow?.metadata,
      },
      nodes: currentNodes,
      edges: currentEdges,
      nodeOutputs,
      selectedNodeId,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${workflow?.name || 'export'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workflow, getNodesRef, getEdgesRef, nodeOutputs, selectedNodeId]);

  const copyWorkflowState = useCallback(() => {
    const currentNodes = getNodesRef.current?.() || [];
    const currentEdges = getEdgesRef.current?.() || [];
    
    const stateData = {
      nodes: currentNodes.length,
      edges: currentEdges.length,
      selectedNode: selectedNodeId,
      executingNode: executingNodeId,
      nodeOutputs: Object.keys(nodeOutputs).length,
      logs: workflowLogs.length,
    };
    
    navigator.clipboard.writeText(JSON.stringify(stateData, null, 2));
    alert('Workflow state copied to clipboard!');
  }, [getNodesRef, getEdgesRef, selectedNodeId, executingNodeId, nodeOutputs, workflowLogs]);

  const logWorkflowState = useCallback(() => {
    const currentNodes = getNodesRef.current?.() || [];
    const currentEdges = getEdgesRef.current?.() || [];
    
    console.group('🐛 Workflow Debug State');
    console.log('Workflow:', workflow);
    console.log('Nodes:', currentNodes);
    console.log('Edges:', currentEdges);
    console.log('Node Outputs:', nodeOutputs);
    console.log('Selected Node:', selectedNodeId);
    console.log('Executing Node:', executingNodeId);
    console.log('Workflow Logs:', workflowLogs);
    console.log('Installed Packages:', installedPackages);
    console.groupEnd();
  }, [workflow, getNodesRef, getEdgesRef, nodeOutputs, selectedNodeId, executingNodeId, workflowLogs, installedPackages]);

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

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 ml-4 p-1 bg-muted rounded-lg">
            <Button
              variant={activeTab === "editor" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("editor")}
              className="h-7 px-3"
            >
              <Code className="h-3.5 w-3.5 mr-1.5" />
              Editor
            </Button>
            <Button
              variant={activeTab === "executions" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("executions")}
              className="h-7 px-3"
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              Executions
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Workflow Active Toggle */}
          <Button
            variant={workflow.isActive ? "default" : "outline"}
            size="sm"
            onClick={handleToggleActive}
            disabled={updateWorkflowMutation.isPending}
            title={workflow.isActive ? "Workflow is active - click to deactivate" : "Workflow is inactive - click to activate"}
            className={workflow.isActive ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Power className="h-4 w-4 mr-2" />
            {updateWorkflowMutation.isPending
              ? "Updating..."
              : workflow.isActive
              ? "Active"
              : "Inactive"}
          </Button>

          <div className="h-4 w-px bg-border" />

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
          
          {/* Debug Tools */}
          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDebugPanelOpen(!debugPanelOpen)}
              title="Toggle Debug Panel"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportWorkflowJSON}
              title="Export Workflow as JSON"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logWorkflowState}
              title="Log State to Console"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (workflow) {
                addLog({ level: "info", message: "Starting full workflow execution" });
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
                      
                      const isSuccess = result.status === "completed";
                      addLog({ 
                        level: isSuccess ? "success" : "error", 
                        message: isSuccess ? "Workflow execution completed" : `Workflow failed: ${result.error}`,
                      });
                      
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
                          const node = workflow.nodes.find(n => n.id === nodeId);
                          const nodeLabel = node?.label || `Node ${nodeId.substring(0, 8)}`;
                          
                          if (nodeResult.status === "completed") {
                            addLog({
                              level: "success",
                              nodeId,
                              nodeLabel,
                              message: `Completed in ${nodeResult.duration}ms`,
                            });
                          } else if (nodeResult.status === "failed") {
                            addLog({
                              level: "error",
                              nodeId,
                              nodeLabel,
                              message: nodeResult.error || "Unknown error",
                            });
                          }
                          
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
                      addLog({ level: "error", message: `Execution failed: ${error.message}` });
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
        {activeTab === "executions" ? (
          <>
            {/* Executions List - Left Side */}
            <div className="w-80 border-r bg-background shrink-0 overflow-hidden">
              <ExecutionsPanel
                workflowId={workflowId}
                organizationId={organizationId}
                selectedExecutionId={selectedExecutionId}
                onSelectExecution={(executionId, nodeOutputs) => {
                  setSelectedExecutionId(executionId);
                  setExecutionNodeOutputs(nodeOutputs);
                }}
              />
            </div>

            {/* Workflow Editor - Right Side (Read-only view of execution) */}
            <div className="flex-1 overflow-hidden">
              {selectedExecutionId && executionNodeOutputs ? (
                <>
                  {console.log("Rendering WorkflowEditor with executionNodeOutputs:", executionNodeOutputs)}
                  {console.log("Workflow nodes:", workflow?.nodes?.map(n => ({ id: n.id, label: n.label })))}
                <WorkflowEditor
                  organizationId={organizationId}
                  workflow={workflow as any}
                  getNodesRef={{ current: null }}
                  getEdgesRef={{ current: null }}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={setSelectedNodeId}
                  executingNodeId={null}
                  nodeOutputs={executionNodeOutputs}
                />
                </>
              ) : (
                <div className="h-full flex items-center justify-center bg-muted/20">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-medium mb-1">Select an Execution</h3>
                    <p className="text-xs text-muted-foreground max-w-[250px]">
                      Click on an execution from the list to view how the workflow ran.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
        {/* Node Palette Sidebar */}
        <div
          className={`border-r bg-muted/50 transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            leftSidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          <div className="w-64 h-full flex flex-col bg-background border-r">
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <h3 className="text-sm font-semibold">Components</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setLeftSidebarOpen(false)}
                title="Close sidebar"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {/* Triggers Section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Triggers</h4>
                <div className="space-y-1.5">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "trigger");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Zap className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Trigger</span>
                        <p className="text-xs text-muted-foreground truncate">Start workflow</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "webhook");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Webhook className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Webhook</span>
                        <p className="text-xs text-muted-foreground truncate">Receive requests</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "manualTrigger");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <MousePointer className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Manual Trigger</span>
                        <p className="text-xs text-muted-foreground truncate">Click to run</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "scheduleTrigger");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Clock className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Schedule</span>
                        <p className="text-xs text-muted-foreground truncate">Run on interval</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "chatTrigger");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <MessageSquare className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Chat Trigger</span>
                        <p className="text-xs text-muted-foreground truncate">On chat message</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions Section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Actions</h4>
                <div className="space-y-1.5">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "code");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Code className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Code</span>
                        <p className="text-xs text-muted-foreground truncate">Execute TypeScript</p>
                      </div>
                    </div>
                  </div>

                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "executeWorkflow");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <GitBranch className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Execute Workflow</span>
                        <p className="text-xs text-muted-foreground truncate">Run subworkflow</p>
                      </div>
                    </div>
                  </div>

                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "webhookResponse");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Send className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Response</span>
                        <p className="text-xs text-muted-foreground truncate">Send HTTP response</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "httpRequest");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Globe className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">HTTP Request</span>
                        <p className="text-xs text-muted-foreground truncate">Make API calls</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "wait");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Timer className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Wait</span>
                        <p className="text-xs text-muted-foreground truncate">Pause execution</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "noop");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <ArrowRight className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">No Operation</span>
                        <p className="text-xs text-muted-foreground truncate">Pass through</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Utilities Section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Utilities</h4>
                <div className="space-y-1.5">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "utilities");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Wrench className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Utilities</span>
                        <p className="text-xs text-muted-foreground truncate">Shared functions</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Transformation Section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Transform Data</h4>
                <div className="space-y-1.5">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "editFields");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <PenLine className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Edit Fields</span>
                        <p className="text-xs text-muted-foreground truncate">Set, add, remove fields</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "dateTime");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Clock className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Date & Time</span>
                        <p className="text-xs text-muted-foreground truncate">Manipulate dates</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter & Limit Section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Filter Items</h4>
                <div className="space-y-1.5">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "filter");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Filter className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Filter</span>
                        <p className="text-xs text-muted-foreground truncate">Remove by condition</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "limit");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <ArrowDown className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Limit</span>
                        <p className="text-xs text-muted-foreground truncate">Restrict item count</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "removeDuplicates");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Copy className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Remove Duplicates</span>
                        <p className="text-xs text-muted-foreground truncate">Unique values</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "splitOut");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <SplitSquareVertical className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Split Out</span>
                        <p className="text-xs text-muted-foreground truncate">Array to items</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Combine Items Section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Combine Items</h4>
                <div className="space-y-1.5">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "aggregate");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <ListPlus className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Aggregate</span>
                        <p className="text-xs text-muted-foreground truncate">Combine into list</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "merge");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <GitMerge className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Merge</span>
                        <p className="text-xs text-muted-foreground truncate">Merge streams</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "summarize");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Calculator className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Summarize</span>
                        <p className="text-xs text-muted-foreground truncate">Sum, count, max...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subworkflow Section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Subworkflow</h4>
                <div className="space-y-1.5">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "workflowInput");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Download className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Workflow Input</span>
                        <p className="text-xs text-muted-foreground truncate">Receives data</p>
                      </div>
                    </div>
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "workflowOutput");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center group-hover:bg-gray-500/20 transition-colors">
                        <Upload className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Workflow Output</span>
                        <p className="text-xs text-muted-foreground truncate">Returns data</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Other</h4>
                <div className="space-y-1.5">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", "workflow");
                    }}
                    className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 cursor-move transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Generic</span>
                        <p className="text-xs text-muted-foreground truncate">Basic node</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle button when left sidebar is closed */}
        {!leftSidebarOpen && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute left-2 top-20 z-10 h-8 w-8 p-0 rounded-md hover:bg-accent"
            onClick={() => setLeftSidebarOpen(true)}
            title="Show components"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Debug Toolbar */}
            <div className="p-2 border-b">
              <DebugToolbar
                isDebugging={isDebugging}
                isPaused={isPaused}
                currentNodeId={debugCurrentNodeId}
                onStartDebug={async () => {
                  try {
                    console.log('[Debug] Starting debug session...');
                    await startDebug();
                    console.log('[Debug] Debug session started successfully');
                    // Auto-open right sidebar to show debug panel
                    setRightSidebarOpen(true);
                  } catch (error) {
                    console.error('[Debug] Failed to start debug session:', error);
                    alert(`Failed to start debug: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }}
                onStepOver={stepOver}
                onContinue={continueExecution}
                onStop={stopDebug}
                isStarting={isStarting}
                isStepping={isStepping}
                isContinuing={isContinuing}
                isStopping={isStopping}
              />
            </div>

            <div className="flex-1 overflow-hidden relative">
              <WorkflowEditor
                organizationId={organizationId}
                workflow={workflow as any}
                getNodesRef={getNodesRef}
                getEdgesRef={getEdgesRef}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
                onExecuteNode={handleExecuteNode}
                executingNodeId={executingNodeId}
                typeDefinitions={(() => {
                  const typeDefs = (workflow?.metadata as { typeDefinitions?: string })?.typeDefinitions;
                  console.log('WorkflowEditorPage - Type Definitions being passed:', typeDefs ? typeDefs.substring(0, 100) + '...' : 'empty/undefined');
                  console.log('WorkflowEditorPage - Full metadata:', workflow?.metadata);
                  return typeDefs;
                })()}
                packageTypeDefinitions={installedPackages?.map(pkg => pkg.typeDefinitions).filter(Boolean).join('\n\n')}
                installedPackages={installedPackages?.map(pkg => ({ name: pkg.name, version: pkg.version }))}
                nodeOutputs={nodeOutputs}
                debugMode={isDebugging}
                breakpoints={breakpoints}
                debugCurrentNodeId={debugCurrentNodeId}
                onToggleBreakpoint={toggleBreakpoint}
                onWebhookEdit={(nodeId, node) => {
                  setEditingWebhookNode(node);
                  setWebhookDialogOpen(true);
                }}
                onExecuteWorkflowEdit={(nodeId, node) => {
                  setEditingExecuteWorkflowNode(node);
                  setExecuteWorkflowDialogOpen(true);
                }}
                onWorkflowInputEdit={(nodeId, node) => {
                  setEditingWorkflowInputNode(node);
                  setWorkflowInputDialogOpen(true);
                }}
                onWorkflowOutputEdit={(nodeId, node) => {
                  setEditingWorkflowOutputNode(node);
                  setWorkflowOutputDialogOpen(true);
                }}
                onFilterEdit={(nodeId, node) => {
                  setEditingFilterNode(node);
                  setFilterDialogOpen(true);
                }}
                onLimitEdit={(nodeId, node) => {
                  setEditingLimitNode(node);
                  setLimitDialogOpen(true);
                }}
                onHttpRequestEdit={(nodeId, node) => {
                  setEditingHttpRequestNode(node);
                  setHttpRequestDialogOpen(true);
                }}
                onEditFieldsEdit={(nodeId, node) => {
                  setEditingEditFieldsNode(node);
                  setEditFieldsDialogOpen(true);
                }}
                onWaitEdit={(nodeId, node) => {
                  setEditingWaitNode(node);
                  setWaitDialogOpen(true);
                }}
                onDateTimeEdit={(nodeId, node) => {
                  setEditingDateTimeNode(node);
                  setDateTimeDialogOpen(true);
                }}
                onAggregateEdit={(nodeId, node) => {
                  setEditingAggregateNode(node);
                  setAggregateDialogOpen(true);
                }}
                onMergeEdit={(nodeId, node) => {
                  setEditingMergeNode(node);
                  setMergeDialogOpen(true);
                }}
                onSplitOutEdit={(nodeId, node) => {
                  setEditingSplitOutNode(node);
                  setSplitOutDialogOpen(true);
                }}
                onRemoveDuplicatesEdit={(nodeId, node) => {
                  setEditingRemoveDuplicatesNode(node);
                  setRemoveDuplicatesDialogOpen(true);
                }}
                onSummarizeEdit={(nodeId, node) => {
                  setEditingSummarizeNode(node);
                  setSummarizeDialogOpen(true);
                }}
              />
            </div>
            
            {/* Debug Panel */}
            {debugPanelOpen && (
              <div className="absolute bottom-16 left-0 right-0 bg-card border-t p-6 z-10 max-h-96 overflow-y-auto shadow-lg">
                <div className="max-w-6xl mx-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Bug className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Developer Tools</h3>
                        <p className="text-sm text-muted-foreground">Debug and inspect your workflow</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDebugPanelOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Quick Stats */}
                    <div className="p-4 rounded-lg border bg-background">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded bg-primary/10">
                          <Code className="h-4 w-4 text-primary" />
                        </div>
                        <h4 className="font-semibold text-sm">Workflow Stats</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nodes</span>
                          <span className="font-medium">{getNodesRef.current?.().length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Connections</span>
                          <span className="font-medium">{getEdgesRef.current?.().length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Packages</span>
                          <span className="font-medium">{installedPackages?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Execution Info */}
                    <div className="p-4 rounded-lg border bg-background">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded bg-secondary/30">
                          <Play className="h-4 w-4 text-secondary-foreground" />
                        </div>
                        <h4 className="font-semibold text-sm">Execution</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Outputs</span>
                          <span className="font-medium">{Object.keys(nodeOutputs).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Logs</span>
                          <span className="font-medium">{workflowLogs.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          {executingNodeId ? (
                            <span className="font-medium text-primary">Running</span>
                          ) : (
                            <span className="font-medium text-muted-foreground">Idle</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Selected Node */}
                    <div className="p-4 rounded-lg border bg-background">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded bg-primary/10">
                          <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <h4 className="font-semibold text-sm">Selection</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        {selectedNodeId ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Selected</span>
                              <span className="font-medium truncate max-w-[120px]" title={selectedNodeId}>
                                {selectedNodeId.substring(0, 8)}...
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Has Output</span>
                              <span className="font-medium">
                                {nodeOutputs[selectedNodeId] ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground">No node selected</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="p-4 rounded-lg border bg-background">
                    <h4 className="font-semibold text-sm mb-3">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportWorkflowJSON}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyWorkflowState}
                      >
                        Copy State
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={logWorkflowState}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Log to Console
                      </Button>
                    </div>
                  </div>
                  
                  {/* Selected Node Output */}
                  {selectedNodeId && nodeOutputs[selectedNodeId] && (
                    <div className="mt-4 p-4 rounded-lg border bg-background">
                      <h4 className="font-semibold text-sm mb-3">Node Output Preview</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-40">
                        {JSON.stringify(nodeOutputs[selectedNodeId], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Workflow Log Panel at the bottom */}
            <WorkflowLogPanel
              logs={workflowLogs}
              isExecuting={!!executingNodeId || runMutation.isPending}
              onClear={() => setWorkflowLogs([])}
              isCollapsed={logPanelCollapsed}
              onToggleCollapse={() => setLogPanelCollapsed(!logPanelCollapsed)}
            />
          </div>

          {/* Right Sidebar - Node Output or Debug Panel */}
          <div 
            className={`border-l bg-background transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
              rightSidebarOpen ? 'w-96' : 'w-0'
            }`}
          >
            <div className="w-96 h-full">
              {isDebugging ? (
                <DebugPanel
                  isOpen={true}
                  onClose={() => setRightSidebarOpen(false)}
                  callStack={debugState.session?.callStack || []}
                  nodeResults={debugState.session?.nodeResults || {}}
                  nodeOutputs={debugState.session?.nodeOutputs || {}}
                  breakpoints={breakpoints}
                  currentNodeId={debugCurrentNodeId}
                  onSelectNode={setSelectedNodeId}
                  onToggleBreakpoint={toggleBreakpoint}
                />
              ) : (
                <NodeOutputPanel
                  selectedNodeId={selectedNodeId}
                  nodeOutputs={nodeOutputs}
                  onClose={() => setRightSidebarOpen(false)}
                />
              )}
            </div>
          </div>

          {/* Toggle button when right sidebar is closed */}
          {!rightSidebarOpen && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-20 z-10 h-8 w-8 p-0 rounded-md hover:bg-accent"
              onClick={() => setRightSidebarOpen(true)}
              title="Show output"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          )}
        </div>
          </>
        )}
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

      {/* Webhook Dialog */}
      {editingWebhookNode && (
        <WebhookDialog
          open={webhookDialogOpen}
          onOpenChange={(open) => {
            setWebhookDialogOpen(open);
            if (!open) {
              setEditingWebhookNode(null);
            }
          }}
          nodeId={editingWebhookNode.id}
          workflowId={workflowId}
          organizationId={organizationId}
          initialConfig={editingWebhookNode.data?.config as { path?: string; method?: string; webhookId?: string } | undefined}
          initialLabel={editingWebhookNode.data?.label || "Webhook"}
          onTestFlow={(testData) => {
            handleWebhookTestFlow(testData);
          }}
          onSave={(data) => {
            // Update the node in the editor via ref
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) => {
              if (node.id === editingWebhookNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label: data.label,
                    config: data.config,
                  },
                };
              }
              return node;
            });
            
            // We need to trigger a save with the updated nodes
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
                nodes: updatedNodes.map((node) => ({
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
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  await utils.workflows.getById.refetch({ organizationId, id: workflowId });
                  setWebhookDialogOpen(false);
                  setEditingWebhookNode(null);
                },
                onError: (error) => {
                  console.error("Error saving webhook node:", error);
                  alert(`Error saving webhook: ${error.message}`);
                },
              }
            );
          }}
        />
      )}

      {/* Execute Workflow Dialog */}
      {editingExecuteWorkflowNode && (
        <ExecuteWorkflowDialog
          open={executeWorkflowDialogOpen}
          onOpenChange={(open) => {
            setExecuteWorkflowDialogOpen(open);
            if (!open) {
              setEditingExecuteWorkflowNode(null);
            }
          }}
          organizationId={organizationId}
          currentWorkflowId={workflowId}
          initialConfig={editingExecuteWorkflowNode.data?.config as { workflowId?: string; workflowName?: string; mode?: "once" | "foreach" } | undefined}
          initialLabel={editingExecuteWorkflowNode.data?.label || "Execute Workflow"}
          onSave={(data) => {
            // Update the node in the editor via ref
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) => {
              if (node.id === editingExecuteWorkflowNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label: data.label,
                    config: data.config,
                  },
                };
              }
              return node;
            });

            // Save with updated nodes
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
                nodes: updatedNodes.map((node) => ({
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
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  await utils.workflows.getById.refetch({ organizationId, id: workflowId });
                  setExecuteWorkflowDialogOpen(false);
                  setEditingExecuteWorkflowNode(null);
                },
                onError: (error) => {
                  console.error("Error saving execute workflow node:", error);
                  alert(`Error saving: ${error.message}`);
                },
              }
            );
          }}
        />
      )}

      {/* Workflow Input Dialog */}
      {editingWorkflowInputNode && (
        <WorkflowInputDialog
          open={workflowInputDialogOpen}
          onOpenChange={(open) => {
            setWorkflowInputDialogOpen(open);
            if (!open) {
              setEditingWorkflowInputNode(null);
            }
          }}
          initialConfig={editingWorkflowInputNode.data?.config as { fields?: Array<{ name: string; type: string; description?: string }> } | undefined}
          initialLabel={editingWorkflowInputNode.data?.label || "Workflow Input"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) => {
              if (node.id === editingWorkflowInputNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label: data.label,
                    config: data.config,
                  },
                };
              }
              return node;
            });

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
                nodes: updatedNodes.map((node) => ({
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
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  await utils.workflows.getById.refetch({ organizationId, id: workflowId });
                  setWorkflowInputDialogOpen(false);
                  setEditingWorkflowInputNode(null);
                },
                onError: (error) => {
                  console.error("Error saving workflow input node:", error);
                  alert(`Error saving: ${error.message}`);
                },
              }
            );
          }}
        />
      )}

      {/* Workflow Output Dialog */}
      {editingWorkflowOutputNode && (
        <WorkflowOutputDialog
          open={workflowOutputDialogOpen}
          onOpenChange={(open) => {
            setWorkflowOutputDialogOpen(open);
            if (!open) {
              setEditingWorkflowOutputNode(null);
            }
          }}
          initialConfig={editingWorkflowOutputNode.data?.config as { fields?: Array<{ name: string; type: string; value?: string; description?: string }> } | undefined}
          initialLabel={editingWorkflowOutputNode.data?.label || "Workflow Output"}
          inputData={editingWorkflowOutputNode.data?.inputData as Array<{ sourceNodeId: string; output: unknown; distance?: number; sourceNodeLabel?: string }> | undefined}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) => {
              if (node.id === editingWorkflowOutputNode.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label: data.label,
                    config: data.config,
                  },
                };
              }
              return node;
            });

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
                nodes: updatedNodes.map((node) => ({
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
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  await utils.workflows.getById.refetch({ organizationId, id: workflowId });
                  setWorkflowOutputDialogOpen(false);
                  setEditingWorkflowOutputNode(null);
                },
                onError: (error) => {
                  console.error("Error saving workflow output node:", error);
                  alert(`Error saving: ${error.message}`);
                },
              }
            );
          }}
        />
      )}

      {/* Filter Node Dialog */}
      {editingFilterNode && (
        <FilterNodeDialog
          open={filterDialogOpen}
          onOpenChange={(open) => {
            setFilterDialogOpen(open);
            if (!open) setEditingFilterNode(null);
          }}
          nodeId={editingFilterNode.id}
          initialConfig={editingFilterNode.data?.config as any}
          initialLabel={editingFilterNode.data?.label || "Filter"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingFilterNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setFilterDialogOpen(false);
                  setEditingFilterNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* Limit Node Dialog */}
      {editingLimitNode && (
        <LimitNodeDialog
          open={limitDialogOpen}
          onOpenChange={(open) => {
            setLimitDialogOpen(open);
            if (!open) setEditingLimitNode(null);
          }}
          nodeId={editingLimitNode.id}
          initialConfig={editingLimitNode.data?.config as any}
          initialLabel={editingLimitNode.data?.label || "Limit"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingLimitNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setLimitDialogOpen(false);
                  setEditingLimitNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* Wait Node Dialog */}
      {editingWaitNode && (
        <WaitNodeDialog
          open={waitDialogOpen}
          onOpenChange={(open) => {
            setWaitDialogOpen(open);
            if (!open) setEditingWaitNode(null);
          }}
          nodeId={editingWaitNode.id}
          initialConfig={editingWaitNode.data?.config as any}
          initialLabel={editingWaitNode.data?.label || "Wait"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingWaitNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setWaitDialogOpen(false);
                  setEditingWaitNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* DateTime Node Dialog */}
      {editingDateTimeNode && (
        <DateTimeNodeDialog
          open={dateTimeDialogOpen}
          onOpenChange={(open) => {
            setDateTimeDialogOpen(open);
            if (!open) setEditingDateTimeNode(null);
          }}
          nodeId={editingDateTimeNode.id}
          initialConfig={editingDateTimeNode.data?.config as any}
          initialLabel={editingDateTimeNode.data?.label || "DateTime"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingDateTimeNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setDateTimeDialogOpen(false);
                  setEditingDateTimeNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* Aggregate Node Dialog */}
      {editingAggregateNode && (
        <AggregateNodeDialog
          open={aggregateDialogOpen}
          onOpenChange={(open) => {
            setAggregateDialogOpen(open);
            if (!open) setEditingAggregateNode(null);
          }}
          nodeId={editingAggregateNode.id}
          initialConfig={editingAggregateNode.data?.config as any}
          initialLabel={editingAggregateNode.data?.label || "Aggregate"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingAggregateNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setAggregateDialogOpen(false);
                  setEditingAggregateNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* Merge Node Dialog */}
      {editingMergeNode && (
        <MergeNodeDialog
          open={mergeDialogOpen}
          onOpenChange={(open) => {
            setMergeDialogOpen(open);
            if (!open) setEditingMergeNode(null);
          }}
          nodeId={editingMergeNode.id}
          initialConfig={editingMergeNode.data?.config as any}
          initialLabel={editingMergeNode.data?.label || "Merge"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingMergeNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setMergeDialogOpen(false);
                  setEditingMergeNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* Split Out Node Dialog */}
      {editingSplitOutNode && (
        <SplitOutNodeDialog
          open={splitOutDialogOpen}
          onOpenChange={(open) => {
            setSplitOutDialogOpen(open);
            if (!open) setEditingSplitOutNode(null);
          }}
          nodeId={editingSplitOutNode.id}
          initialConfig={editingSplitOutNode.data?.config as any}
          initialLabel={editingSplitOutNode.data?.label || "Split Out"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingSplitOutNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setSplitOutDialogOpen(false);
                  setEditingSplitOutNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* Remove Duplicates Node Dialog */}
      {editingRemoveDuplicatesNode && (
        <RemoveDuplicatesNodeDialog
          open={removeDuplicatesDialogOpen}
          onOpenChange={(open) => {
            setRemoveDuplicatesDialogOpen(open);
            if (!open) setEditingRemoveDuplicatesNode(null);
          }}
          nodeId={editingRemoveDuplicatesNode.id}
          initialConfig={editingRemoveDuplicatesNode.data?.config as any}
          initialLabel={editingRemoveDuplicatesNode.data?.label || "Remove Duplicates"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingRemoveDuplicatesNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setRemoveDuplicatesDialogOpen(false);
                  setEditingRemoveDuplicatesNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* Summarize Node Dialog */}
      {editingSummarizeNode && (
        <SummarizeNodeDialog
          open={summarizeDialogOpen}
          onOpenChange={(open) => {
            setSummarizeDialogOpen(open);
            if (!open) setEditingSummarizeNode(null);
          }}
          nodeId={editingSummarizeNode.id}
          initialConfig={editingSummarizeNode.data?.config as any}
          initialLabel={editingSummarizeNode.data?.label || "Summarize"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingSummarizeNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setSummarizeDialogOpen(false);
                  setEditingSummarizeNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* Edit Fields Node Dialog */}
      {editingEditFieldsNode && (
        <EditFieldsNodeDialog
          open={editFieldsDialogOpen}
          onOpenChange={(open) => {
            setEditFieldsDialogOpen(open);
            if (!open) setEditingEditFieldsNode(null);
          }}
          nodeId={editingEditFieldsNode.id}
          initialConfig={editingEditFieldsNode.data?.config as any}
          initialLabel={editingEditFieldsNode.data?.label || "Edit Fields"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingEditFieldsNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setEditFieldsDialogOpen(false);
                  setEditingEditFieldsNode(null);
                },
              }
            );
          }}
        />
      )}

      {/* HTTP Request Node Dialog */}
      {editingHttpRequestNode && (
        <HttpRequestNodeDialog
          open={httpRequestDialogOpen}
          onOpenChange={(open) => {
            setHttpRequestDialogOpen(open);
            if (!open) setEditingHttpRequestNode(null);
          }}
          nodeId={editingHttpRequestNode.id}
          initialConfig={editingHttpRequestNode.data?.config as any}
          initialLabel={editingHttpRequestNode.data?.label || "HTTP Request"}
          onSave={(data) => {
            const currentNodes = getNodesRef.current?.() || [];
            const updatedNodes = currentNodes.map((node) =>
              node.id === editingHttpRequestNode.id
                ? { ...node, data: { ...node.data, label: data.label, config: data.config } }
                : node
            );
            const currentEdges = getEdgesRef.current?.() || [];
            saveMutation.mutate(
              {
                organizationId,
                workflowId: workflow.id,
                workflow: { name: workflow.name, description: workflow.description || undefined, version: workflow.version, metadata: workflow.metadata || undefined },
                nodes: updatedNodes.map((node) => ({ id: node.id, type: node.type || "workflow", label: node.data.label || "Node", position: node.position, config: node.data.config || {}, executionOrder: 0 })),
                connections: currentEdges.map((edge) => ({ id: edge.id || undefined, sourceNodeId: edge.source, targetNodeId: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined })),
              },
              {
                onSuccess: async () => {
                  await utils.workflows.getById.invalidate({ organizationId, id: workflowId });
                  setHttpRequestDialogOpen(false);
                  setEditingHttpRequestNode(null);
                },
              }
            );
          }}
        />
      )}
    </div>
  );
}
