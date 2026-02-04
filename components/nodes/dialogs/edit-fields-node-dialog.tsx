"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

interface Operation {
  operation: "set" | "rename" | "remove";
  field: string;
  value?: string;
  newName?: string;
}

interface EditFieldsNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId: string;
  initialConfig?: {
    operations?: Operation[];
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: { operations: Operation[] } }) => void;
}

export function EditFieldsNodeDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialConfig,
  initialLabel = "Edit Fields",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: EditFieldsNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [operations, setOperations] = useState<Operation[]>(
    initialConfig?.operations || [{ operation: "set", field: "", value: "" }]
  );

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setOperations(initialConfig?.operations || [{ operation: "set", field: "", value: "" }]);
    }
  }, [open, initialLabel, initialConfig]);

  const addOperation = () => {
    setOperations([...operations, { operation: "set", field: "", value: "" }]);
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
    const validOperations = operations.filter(op => op.field.trim());
    onSave({
      label: label.trim() || "Edit Fields",
      config: {
        operations: validOperations.length > 0 ? validOperations : [{ operation: "set", field: "", value: "" }],
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NodeDialogLayout
        title="Configure Edit Fields"
        icon={<Pencil className="h-5 w-5 text-gray-500" />}
        sidebar={{
          inputData,
          sourceNodeLabels,
          organizationId,
        }}
        className="max-h-[80vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Edit Fields"
            />
          </div>

          <div>
            <Label className="mb-2 block">Operations</Label>
            <div className="space-y-3">
              {operations.map((op, index) => (
                <div key={index} className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Select
                        value={op.operation}
                        onValueChange={(v) => updateOperation(index, { operation: v as Operation["operation"] })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="set">Set</SelectItem>
                          <SelectItem value="rename">Rename</SelectItem>
                          <SelectItem value="remove">Remove</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex-1">
                        <ExpressionInput
                          value={op.field}
                          onChange={(v) => updateOperation(index, { field: v })}
                          placeholder="Field name (e.g., $json.email)"
                          inputData={inputData}
                          sourceNodeLabels={sourceNodeLabels}
                        />
                      </div>
                    </div>
                    {op.operation === "set" && (
                      <ExpressionInput
                        value={op.value || ""}
                        onChange={(v) => updateOperation(index, { value: v })}
                        placeholder="Value to set"
                        inputData={inputData}
                        sourceNodeLabels={sourceNodeLabels}
                      />
                    )}
                    {op.operation === "rename" && (
                      <Input
                        placeholder="New field name"
                        value={op.newName || ""}
                        onChange={(e) => updateOperation(index, { newName: e.target.value })}
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOperation(index)}
                    disabled={operations.length === 1}
                    className="hover:bg-red-100 hover:text-red-600 mt-1"
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
