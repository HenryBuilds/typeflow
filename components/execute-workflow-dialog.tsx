"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitBranch, Loader2, Search, AlertCircle, Check } from "lucide-react";

interface ExecuteWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  currentWorkflowId: string; // To exclude current workflow from selection
  initialConfig?: {
    workflowId?: string;
    workflowName?: string;
    mode?: "once" | "foreach";
  };
  initialLabel?: string;
  onSave: (data: {
    label: string;
    config: {
      workflowId: string;
      workflowName: string;
      mode: "once" | "foreach";
    };
  }) => void;
}

export function ExecuteWorkflowDialog({
  open,
  onOpenChange,
  organizationId,
  currentWorkflowId,
  initialConfig,
  initialLabel = "Execute Workflow",
  onSave,
}: ExecuteWorkflowDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(initialConfig?.workflowId || "");
  const [mode, setMode] = useState<"once" | "foreach">(initialConfig?.mode || "once");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch available workflows
  const { data: workflows, isLoading } = trpc.workflows.list.useQuery(
    { organizationId },
    { enabled: open && !!organizationId }
  );

  // Filter out current workflow and apply search
  const availableWorkflows = workflows?.filter(
    (w) => w.id !== currentWorkflowId &&
           w.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const selectedWorkflow = workflows?.find((w) => w.id === selectedWorkflowId);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setSelectedWorkflowId(initialConfig?.workflowId || "");
      setMode(initialConfig?.mode || "once");
      setSearchQuery("");
    }
  }, [open, initialLabel, initialConfig]);

  const handleSave = () => {
    if (!selectedWorkflowId || !selectedWorkflow) return;

    onSave({
      label: label.trim() || "Execute Workflow",
      config: {
        workflowId: selectedWorkflowId,
        workflowName: selectedWorkflow.name,
        mode,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Configure Execute Workflow
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Node Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Execute Workflow"
            />
          </div>

          {/* Workflow Selection */}
          <div className="space-y-2">
            <Label>Select Workflow to Execute</Label>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Workflow List */}
            <div className="border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableWorkflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No workflows match your search"
                      : "No other workflows available"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create other workflows first to use them as subworkflows
                  </p>
                </div>
              ) : (
                <div className="h-48 overflow-y-auto p-2 space-y-1">
                  {availableWorkflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      type="button"
                      onClick={() => setSelectedWorkflowId(workflow.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedWorkflowId === workflow.id
                          ? "bg-primary/10 dark:bg-primary/20 border border-primary/50 dark:border-primary/40"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GitBranch className={`h-4 w-4 ${
                          selectedWorkflowId === workflow.id
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {workflow.name}
                          </div>
                          {workflow.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {workflow.description}
                            </div>
                          )}
                        </div>
                        {workflow.isActive && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Execution Mode */}
          <div className="space-y-2">
            <Label>Execution Mode</Label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMode("once")}
                className={`w-full flex items-start gap-3 p-3 rounded-md border transition-colors text-left ${
                  mode === "once"
                    ? "border-primary bg-primary/10 dark:bg-primary/20"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  mode === "once" ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {mode === "once" && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Execute Once</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Run the subworkflow once with all input items passed as an array
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("foreach")}
                className={`w-full flex items-start gap-3 p-3 rounded-md border transition-colors text-left ${
                  mode === "foreach"
                    ? "border-primary bg-primary/10 dark:bg-primary/20"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  mode === "foreach" ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {mode === "foreach" && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Execute for Each Item</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Run the subworkflow separately for each input item and merge results
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedWorkflowId}
            className="bg-primary hover:bg-primary/90"
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
