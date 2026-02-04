"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Plus, Trash2, GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpressionInput } from "@/components/ui/expression-input";
import { InputDataItem } from "./types";

interface Condition {
  field: string;
  operator: "equals" | "notEquals" | "contains" | "notContains" | "greaterThan" | "lessThan" | "isEmpty" | "isNotEmpty" | "isTrue" | "isFalse" | "regex";
  value: string;
}

interface SwitchCase {
  id: string;
  name: string;
  conditions: Condition[];
  combineWith: "and" | "or";
}

import { NodeDialogLayout } from "./node-dialog-layout";

interface SwitchNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId: string;
  initialConfig?: {
    mode?: "rules" | "expression";
    cases?: SwitchCase[];
    fallbackEnabled?: boolean;
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { 
    label: string; 
    config: { 
      mode: "rules" | "expression";
      cases: SwitchCase[]; 
      fallbackEnabled: boolean;
    } 
  }) => void;
}

function generateCaseId(): string {
  return `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function SwitchNodeDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialConfig,
  initialLabel = "Switch",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: SwitchNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [cases, setCases] = useState<SwitchCase[]>(
    initialConfig?.cases || [
      { id: generateCaseId(), name: "Case 1", conditions: [{ field: "", operator: "equals", value: "" }], combineWith: "and" }
    ]
  );
  const [fallbackEnabled, setFallbackEnabled] = useState(initialConfig?.fallbackEnabled !== false);

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setCases(initialConfig?.cases?.length ? initialConfig.cases : [
        { id: generateCaseId(), name: "Case 1", conditions: [{ field: "", operator: "equals", value: "" }], combineWith: "and" }
      ]);
      setFallbackEnabled(initialConfig?.fallbackEnabled !== false);
    }
  }, [open, initialLabel, initialConfig]);

  const addCase = () => {
    const newCase: SwitchCase = {
      id: generateCaseId(),
      name: `Case ${cases.length + 1}`,
      conditions: [{ field: "", operator: "equals", value: "" }],
      combineWith: "and",
    };
    setCases([...cases, newCase]);
  };

  const removeCase = (caseId: string) => {
    if (cases.length > 1) {
      setCases(cases.filter((c) => c.id !== caseId));
    }
  };

  const updateCase = (caseId: string, updates: Partial<SwitchCase>) => {
    setCases(cases.map((c) => (c.id === caseId ? { ...c, ...updates } : c)));
  };

  const addCondition = (caseId: string) => {
    setCases(cases.map((c) => 
      c.id === caseId 
        ? { ...c, conditions: [...c.conditions, { field: "", operator: "equals", value: "" }] }
        : c
    ));
  };

  const removeCondition = (caseId: string, conditionIndex: number) => {
    setCases(cases.map((c) => {
      if (c.id === caseId && c.conditions.length > 1) {
        return { ...c, conditions: c.conditions.filter((_, i) => i !== conditionIndex) };
      }
      return c;
    }));
  };

  const updateCondition = (caseId: string, conditionIndex: number, updates: Partial<Condition>) => {
    setCases(cases.map((c) => {
      if (c.id === caseId) {
        return {
          ...c,
          conditions: c.conditions.map((cond, i) => 
            i === conditionIndex ? { ...cond, ...updates } : cond
          ),
        };
      }
      return c;
    }));
  };

  const handleSave = () => {
    // Filter out empty cases but ensure at least one exists
    const validCases = cases.map(c => ({
      ...c,
      conditions: c.conditions.filter(cond => cond.field.trim()),
    })).filter(c => c.conditions.length > 0);

    onSave({
      label: label.trim() || "Switch",
      config: {
        mode: "rules",
        cases: validCases.length > 0 ? validCases : [
          { id: generateCaseId(), name: "Case 1", conditions: [{ field: "", operator: "equals", value: "" }], combineWith: "and" }
        ],
        fallbackEnabled,
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
    { value: "isEmpty", label: "Is Empty" },
    { value: "isNotEmpty", label: "Is Not Empty" },
    { value: "isTrue", label: "Is True" },
    { value: "isFalse", label: "Is False" },
    { value: "regex", label: "Matches Regex" },
  ];

  const noValueOperators = ["isEmpty", "isNotEmpty", "isTrue", "isFalse"];

  // Colors for case indicators
  const caseColors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-cyan-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NodeDialogLayout
        title="Configure Switch"
        icon={<Network className="h-5 w-5 text-purple-600" />}
        sidebar={{
          inputData,
          sourceNodeLabels,
          organizationId,
        }}
        className="max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Route data to different outputs based on matching rules. Cases are evaluated in order - the first match wins.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="label">Node Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Switch"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="fallback"
                checked={fallbackEnabled}
                onCheckedChange={(checked) => setFallbackEnabled(checked === true)}
              />
              <Label htmlFor="fallback" className="cursor-pointer">Enable fallback output</Label>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Cases</Label>
            
            {cases.map((caseItem, caseIndex) => (
              <div 
                key={caseItem.id} 
                className="border rounded-lg p-4 space-y-3 bg-muted/20"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${caseColors[caseIndex % caseColors.length]}`} />
                  <Input
                    value={caseItem.name}
                    onChange={(e) => updateCase(caseItem.id, { name: e.target.value })}
                    placeholder="Case name"
                    className="flex-1 h-8 text-sm font-medium"
                  />
                  {caseItem.conditions.length > 1 && (
                    <Select 
                      value={caseItem.combineWith} 
                      onValueChange={(v) => updateCase(caseItem.id, { combineWith: v as "and" | "or" })}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="and">AND</SelectItem>
                        <SelectItem value="or">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCase(caseItem.id)}
                    disabled={cases.length === 1}
                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 pl-5">
                  {caseItem.conditions.map((condition, conditionIndex) => (
                    <div key={conditionIndex} className="flex items-center gap-2">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <ExpressionInput
                          value={condition.field}
                          onChange={(v) => updateCondition(caseItem.id, conditionIndex, { field: v })}
                          placeholder="Field"
                          inputData={inputData}
                          sourceNodeLabels={sourceNodeLabels}
                          className="h-8 text-sm"
                        />
                        <Select
                          value={condition.operator}
                          onValueChange={(v) => updateCondition(caseItem.id, conditionIndex, { operator: v as Condition["operator"] })}
                        >
                          <SelectTrigger className="h-8 text-sm">
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
                            onChange={(v) => updateCondition(caseItem.id, conditionIndex, { value: v })}
                            placeholder="Value"
                            inputData={inputData}
                            sourceNodeLabels={sourceNodeLabels}
                            className="h-8 text-sm"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(caseItem.id, conditionIndex)}
                        disabled={caseItem.conditions.length === 1}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addCondition(caseItem.id)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Condition
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCase}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Case
            </Button>
          </div>

          {fallbackEnabled && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm text-muted-foreground">
                Fallback (else): Items that don&apos;t match any case will be routed here
              </span>
            </div>
          )}

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
