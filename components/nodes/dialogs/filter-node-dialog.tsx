"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Condition {
  field: string;
  operator: "equals" | "notEquals" | "contains" | "notContains" | "greaterThan" | "lessThan" | "isEmpty" | "isNotEmpty";
  value: string;
}

interface FilterNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    conditions?: Condition[];
    combineWith?: "and" | "or";
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { conditions: Condition[]; combineWith: "and" | "or" } }) => void;
}

export function FilterNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "Filter",
  onSave,
}: FilterNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [conditions, setConditions] = useState<Condition[]>(
    initialConfig?.conditions || [{ field: "", operator: "equals", value: "" }]
  );
  const [combineWith, setCombineWith] = useState<"and" | "or">(initialConfig?.combineWith || "and");

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setConditions(initialConfig?.conditions || [{ field: "", operator: "equals", value: "" }]);
      setCombineWith(initialConfig?.combineWith || "and");
    }
  }, [open, initialLabel, initialConfig]);

  const addCondition = () => {
    setConditions([...conditions, { field: "", operator: "equals", value: "" }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    setConditions(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const handleSave = () => {
    const validConditions = conditions.filter(c => c.field.trim());
    onSave({
      label: label.trim() || "Filter",
      config: {
        conditions: validConditions.length > 0 ? validConditions : [{ field: "", operator: "equals", value: "" }],
        combineWith,
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
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            Configure Filter
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Filter"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Conditions</Label>
              <Select value={combineWith} onValueChange={(v) => setCombineWith(v as "and" | "or")}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">AND</SelectItem>
                  <SelectItem value="or">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Field (e.g., data.status)"
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value })}
                    />
                    <Select
                      value={condition.operator}
                      onValueChange={(v) => updateCondition(index, { operator: v as Condition["operator"] })}
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
                    {!["isEmpty", "isNotEmpty"].includes(condition.operator) && (
                      <Input
                        placeholder="Value"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(index)}
                    disabled={conditions.length === 1}
                    className="hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCondition}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Condition
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
