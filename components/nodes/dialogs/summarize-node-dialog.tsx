"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Operation {
  field: string;
  operation: "sum" | "count" | "average" | "min" | "max" | "countUnique";
  outputField?: string;
}

interface SummarizeNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    operations?: Operation[];
    groupBy?: string[];
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { operations: Operation[]; groupBy: string[] } }) => void;
}

export function SummarizeNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "Summarize",
  onSave,
}: SummarizeNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [operations, setOperations] = useState<Operation[]>(
    initialConfig?.operations || [{ field: "", operation: "count", outputField: "" }]
  );
  const [groupByStr, setGroupByStr] = useState(initialConfig?.groupBy?.join(", ") || "");

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setOperations(initialConfig?.operations || [{ field: "", operation: "count", outputField: "" }]);
      setGroupByStr(initialConfig?.groupBy?.join(", ") || "");
    }
  }, [open, initialLabel, initialConfig]);

  const addOperation = () => {
    setOperations([...operations, { field: "", operation: "count", outputField: "" }]);
  };

  const removeOperation = (index: number) => {
    if (operations.length > 1) {
      setOperations(operations.filter((_, i) => i !== index));
    }
  };

  const updateOperation = (index: number, updates: Partial<Operation>) => {
    setOperations(operations.map((op, i) => (i === index ? { ...op, ...updates } : op)));
  };

  const handleSave = () => {
    const validOperations = operations.filter(op => op.field.trim() || op.operation === "count");
    const groupBy = groupByStr.split(",").map(s => s.trim()).filter(Boolean);

    onSave({
      label: label.trim() || "Summarize",
      config: {
        operations: validOperations.length > 0 ? validOperations : [{ field: "", operation: "count", outputField: "count" }],
        groupBy,
      },
    });
    onOpenChange(false);
  };

  const operationTypes = [
    { value: "count", label: "Count" },
    { value: "sum", label: "Sum" },
    { value: "average", label: "Average" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
    { value: "countUnique", label: "Count Unique" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-gray-500" />
            Configure Summarize
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Summarize"
            />
          </div>

          <div>
            <Label className="mb-2 block">Operations</Label>
            <div className="space-y-3">
              {operations.map((op, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Select
                      value={op.operation}
                      onValueChange={(v) => updateOperation(index, { operation: v as Operation["operation"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operationTypes.map((ot) => (
                          <SelectItem key={ot.value} value={ot.value}>
                            {ot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Field (e.g., data.amount)"
                      value={op.field}
                      onChange={(e) => updateOperation(index, { field: e.target.value })}
                      disabled={op.operation === "count"}
                    />
                    <Input
                      placeholder="Output field name"
                      value={op.outputField || ""}
                      onChange={(e) => updateOperation(index, { outputField: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOperation(index)}
                    disabled={operations.length === 1}
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
              onClick={addOperation}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Operation
            </Button>
          </div>

          <div>
            <Label htmlFor="groupBy">Group By (optional)</Label>
            <Input
              id="groupBy"
              value={groupByStr}
              onChange={(e) => setGroupByStr(e.target.value)}
              placeholder="e.g., category, region (comma-separated)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Group results by these fields (comma-separated)
            </p>
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
