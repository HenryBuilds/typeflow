"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitBranch, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpressionInput } from "@/components/ui/expression-input";
import { InputDataItem } from "./types";
import { NodeDialogLayout } from "./node-dialog-layout";

interface Condition {
  field: string;
  operator: "equals" | "notEquals" | "contains" | "notContains" | "greaterThan" | "lessThan" | "greaterThanOrEqual" | "lessThanOrEqual" | "isEmpty" | "isNotEmpty" | "isTrue" | "isFalse" | "regex" | "exists" | "notExists";
  value: string;
}

interface Branch {
  id: string;
  name: string;
  conditions: Condition[];
  combineWith: "and" | "or";
}

interface IfNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId?: string; // Added prop
  initialConfig?: {
    // Legacy format (single branch)
    conditions?: Condition[];
    combineWith?: "and" | "or";
    // New format (multiple branches)
    branches?: Branch[];
    elseEnabled?: boolean;
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: { branches: Branch[]; elseEnabled: boolean } }) => void;
}

export function IfNodeDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialConfig,
  initialLabel = "IF",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: IfNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [elseEnabled, setElseEnabled] = useState(true);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      
      // Handle both legacy and new format
      if (initialConfig?.branches && initialConfig.branches.length > 0) {
        setBranches(initialConfig.branches);
        setElseEnabled(initialConfig.elseEnabled !== false);
      } else if (initialConfig?.conditions) {
        // Convert legacy format to new format
        const legacyBranch: Branch = {
          id: generateId(),
          name: "if",
          conditions: initialConfig.conditions,
          combineWith: initialConfig.combineWith || "and",
        };
        setBranches([legacyBranch]);
        setElseEnabled(true);
      } else {
        // Default: one empty branch
        setBranches([{
          id: generateId(),
          name: "if",
          conditions: [{ field: "", operator: "equals", value: "" }],
          combineWith: "and",
        }]);
        setElseEnabled(true);
      }
      
      // Expand first branch by default
      setExpandedBranch(null);
    }
  }, [open, initialLabel, initialConfig]);

  const addBranch = () => {
    const newBranch: Branch = {
      id: generateId(),
      name: `else if ${branches.length}`,
      conditions: [{ field: "", operator: "equals", value: "" }],
      combineWith: "and",
    };
    setBranches([...branches, newBranch]);
    setExpandedBranch(newBranch.id);
  };

  const removeBranch = (branchId: string) => {
    if (branches.length > 1) {
      setBranches(branches.filter(b => b.id !== branchId));
    }
  };

  const updateBranch = (branchId: string, updates: Partial<Branch>) => {
    setBranches(branches.map(b => b.id === branchId ? { ...b, ...updates } : b));
  };

  const addConditionToBranch = (branchId: string) => {
    setBranches(branches.map(b => {
      if (b.id === branchId) {
        return {
          ...b,
          conditions: [...b.conditions, { field: "", operator: "equals" as const, value: "" }],
        };
      }
      return b;
    }));
  };

  const removeConditionFromBranch = (branchId: string, conditionIndex: number) => {
    setBranches(branches.map(b => {
      if (b.id === branchId && b.conditions.length > 1) {
        return {
          ...b,
          conditions: b.conditions.filter((_, i) => i !== conditionIndex),
        };
      }
      return b;
    }));
  };

  const updateConditionInBranch = (branchId: string, conditionIndex: number, updates: Partial<Condition>) => {
    setBranches(branches.map(b => {
      if (b.id === branchId) {
        return {
          ...b,
          conditions: b.conditions.map((c, i) => i === conditionIndex ? { ...c, ...updates } : c),
        };
      }
      return b;
    }));
  };

  const handleSave = () => {
    // Ensure all branches have at least one valid condition
    const validBranches = branches.map(b => ({
      ...b,
      conditions: b.conditions.filter(c => c.field.trim()).length > 0 
        ? b.conditions.filter(c => c.field.trim())
        : [{ field: "", operator: "equals" as const, value: "" }],
    }));

    onSave({
      label: label.trim() || "IF",
      config: {
        branches: validBranches,
        elseEnabled,
      },
    });
    onOpenChange(false);
  };

  const operators = [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "notContains", label: "Not Contains" },
    { value: "greaterThan", label: "Greater Than" },
    { value: "lessThan", label: "Less Than" },
    { value: "greaterThanOrEqual", label: "Greater Than or Equal" },
    { value: "lessThanOrEqual", label: "Less Than or Equal" },
    { value: "isEmpty", label: "Is Empty" },
    { value: "isNotEmpty", label: "Is Not Empty" },
    { value: "isTrue", label: "Is True" },
    { value: "isFalse", label: "Is False" },
    { value: "exists", label: "Exists" },
    { value: "notExists", label: "Not Exists" },
    { value: "regex", label: "Matches Regex" },
  ];

  const noValueOperators = ["isEmpty", "isNotEmpty", "isTrue", "isFalse", "exists", "notExists"];

  const getBranchLabel = (index: number) => {
    if (index === 0) return "if";
    return `else if`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NodeDialogLayout
        title="Configure IF Branch"
        icon={<GitBranch className="h-5 w-5 text-gray-600" />}
        sidebar={{
          inputData,
          sourceNodeLabels,
          organizationId,
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Items are routed to the first matching branch. If no branch matches, items go to <span className="text-gray-600 font-medium">else</span>.
          </p>
          
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="IF"
            />
          </div>

          {/* Branches */}
          <div className="space-y-3">
            <Label>Branches</Label>
            
            {branches.map((branch, branchIndex) => (
              <div key={branch.id} className="border rounded-lg overflow-hidden">
                {/* Branch header */}
                <div 
                  className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/70"
                  onClick={() => setExpandedBranch(expandedBranch === branch.id ? null : branch.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-primary">
                      {getBranchLabel(branchIndex)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({branch.conditions.filter(c => c.field.trim()).length} condition{branch.conditions.filter(c => c.field.trim()).length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {branches.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBranch(branch.id);
                        }}
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    {expandedBranch === branch.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Branch conditions */}
                {expandedBranch === branch.id && (
                  <div className="p-3 border-t space-y-3">
                    {branch.conditions.length > 1 && (
                      <div className="flex justify-end">
                        <Select 
                          value={branch.combineWith} 
                          onValueChange={(v) => updateBranch(branch.id, { combineWith: v as "and" | "or" })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="and">AND</SelectItem>
                            <SelectItem value="or">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {branch.conditions.map((condition, condIndex) => (
                      <div key={condIndex} className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <ExpressionInput
                              value={condition.field}
                              onChange={(v) => updateConditionInBranch(branch.id, condIndex, { field: v })}
                              placeholder="Field (e.g., $json.status)"
                              inputData={inputData}
                              sourceNodeLabels={sourceNodeLabels}
                            />
                            <Select
                              value={condition.operator}
                              onValueChange={(v) => updateConditionInBranch(branch.id, condIndex, { operator: v as Condition["operator"] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!noValueOperators.includes(condition.operator) && (
                              <ExpressionInput
                                value={condition.value}
                                onChange={(v) => updateConditionInBranch(branch.id, condIndex, { value: v })}
                                placeholder="Value"
                                inputData={inputData}
                                sourceNodeLabels={sourceNodeLabels}
                              />
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeConditionFromBranch(branch.id, condIndex)}
                          disabled={branch.conditions.length === 1}
                          className="hover:bg-red-100 hover:text-red-600 mt-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addConditionToBranch(branch.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Condition
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Add else if button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBranch}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Else If Branch
            </Button>

            {/* Else toggle */}
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              <input
                type="checkbox"
                id="elseEnabled"
                checked={elseEnabled}
                onChange={(e) => setElseEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="elseEnabled" className="text-sm">
                Include <span className="font-mono font-medium">else</span> output for non-matching items
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur py-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </NodeDialogLayout>
    </Dialog>
  );
}
