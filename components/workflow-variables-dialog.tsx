
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Edit, Eye, EyeOff, Lock } from "lucide-react";

interface WorkflowVariablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  workflowId: string;
}

export function WorkflowVariablesDialog({
  open,
  onOpenChange,
  organizationId,
  workflowId,
}: WorkflowVariablesDialogProps) {
  const utils = trpc.useUtils();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [description, setDescription] = useState("");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const { data: variables, isLoading } = trpc.environments.list.useQuery({
    organizationId,
    workflowId,
  });

  const createMutation = trpc.environments.set.useMutation({
    onSuccess: () => {
      utils.environments.list.invalidate({ organizationId, workflowId });
      resetForm();
    },
  });

  const deleteMutation = trpc.environments.delete.useMutation({
    onSuccess: () => {
      utils.environments.list.invalidate({ organizationId, workflowId });
    },
  });

  const resetForm = () => {
    setEditingKey(null);
    setKey("");
    setValue("");
    setIsSecret(false);
    setDescription("");
  };

  const handleEdit = (variable: any) => {
    setEditingKey(variable.key);
    setKey(variable.key);
    setValue(variable.isSecret ? "" : variable.value);
    setIsSecret(variable.isSecret);
    setDescription(variable.description || "");
  };

  const handleSave = async () => {
    await createMutation.mutateAsync({
      organizationId,
      workflowId,
      key,
      value,
      isSecret,
      description,
    });
  };

  const handleDelete = async (keyToDelete: string) => {
    if (confirm(`Are you sure you want to delete variable ${keyToDelete}?`)) {
      await deleteMutation.mutateAsync({
        organizationId,
        workflowId,
        key: keyToDelete,
      });
    }
  };

  const toggleShowSecret = (varKey: string) => {
    setShowSecrets(prev => ({ ...prev, [varKey]: !prev[varKey] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Variables</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List of Variables */}
          <div className="md:col-span-2 border rounded-md overflow-hidden flex flex-col">
            <div className="grid grid-cols-3 bg-muted p-2 font-medium text-sm">
              <div>Key</div>
              <div>Value</div>
              <div className="text-right">Actions</div>
            </div>
            
            {isLoading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : variables?.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No variables defined for this workflow.
              </div>
            ) : (
              <div className="divide-y">
                {variables?.map((v) => (
                  <div key={v.key} className="grid grid-cols-3 p-2 items-center text-sm">
                    <div className="font-mono truncate pr-2" title={v.key}>{v.key}</div>
                    <div className="font-mono truncate pr-2">
                       {v.isSecret ? (
                          <div className="flex items-center gap-2">
                            <Lock className="w-3 h-3 text-orange-500" />
                            <span className="truncate max-w-[100px]">{showSecrets[v.key] ? v.value : "••••••••"}</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => toggleShowSecret(v.key)}>
                                {showSecrets[v.key] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        ) : (
                          <span className="truncate block max-w-[150px]" title={v.value}>{v.value}</span>
                        )}
                    </div>
                    <div className="text-right flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(v)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(v.key)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit/Create Form */}
          <div className="space-y-4 border p-4 rounded-md h-fit">
            <h3 className="font-semibold">{editingKey ? "Edit Variable" : "New Variable"}</h3>
            
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="API_KEY"
                disabled={!!editingKey} // Cannot change key when editing
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="value..."
                type={isSecret && !showSecrets["new"] ? "password" : "text"}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isSecret"
                checked={isSecret}
                onCheckedChange={(c) => setIsSecret(!!c)}
              />
              <Label htmlFor="isSecret" className="text-sm font-normal">Is Secret?</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="h-20"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {editingKey && (
                <Button variant="outline" className="flex-1" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button 
                className="flex-1" 
                onClick={handleSave}
                disabled={!key || createMutation.isPending}
              >
                {editingKey ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
