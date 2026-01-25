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

interface FieldOperation {
  action: "set" | "delete" | "rename";
  field: string;
  value?: string;
  newName?: string;
}

interface EditFieldsNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    operations?: FieldOperation[];
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { operations: FieldOperation[] } }) => void;
}

export function EditFieldsNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "Edit Fields",
  onSave,
}: EditFieldsNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [operations, setOperations] = useState<FieldOperation[]>(
    initialConfig?.operations || [{ action: "set", field: "", value: "" }]
  );

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setOperations(initialConfig?.operations || [{ action: "set", field: "", value: "" }]);
    }
  }, [open, initialLabel, initialConfig]);

  const addOperation = () => {
    setOperations([...operations, { action: "set", field: "", value: "" }]);
  };

  const removeOperation = (index: number) => {
    if (operations.length > 1) {
      setOperations(operations.filter((_, i) => i !== index));
    }
  };

  const updateOperation = (index: number, updates: Partial<FieldOperation>) => {
    setOperations(operations.map((op, i) => (i === index ? { ...op, ...updates } : op)));
  };

  const handleSave = () => {
    const validOperations = operations.filter(op => op.field.trim());
    onSave({
      label: label.trim() || "Edit Fields",
      config: {
        operations: validOperations.length > 0 ? validOperations : [{ action: "set", field: "", value: "" }],
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-gray-500" />
            Configure Edit Fields
          </DialogTitle>
        </DialogHeader>
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
            <Label className="mb-2 block">Field Operations</Label>
            <div className="space-y-3">
              {operations.map((op, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Select
                      value={op.action}
                      onValueChange={(v) => updateOperation(index, { action: v as FieldOperation["action"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set">Set Value</SelectItem>
                        <SelectItem value="delete">Delete Field</SelectItem>
                        <SelectItem value="rename">Rename Field</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Field name"
                      value={op.field}
                      onChange={(e) => updateOperation(index, { field: e.target.value })}
                    />
                    {op.action === "set" && (
                      <Input
                        placeholder="Value (or {{field}} for reference)"
                        value={op.value || ""}
                        onChange={(e) => updateOperation(index, { value: e.target.value })}
                      />
                    )}
                    {op.action === "rename" && (
                      <Input
                        placeholder="New field name"
                        value={op.newName || ""}
                        onChange={(e) => updateOperation(index, { newName: e.target.value })}
                      />
                    )}
                    {op.action === "delete" && (
                      <div className="text-xs text-muted-foreground flex items-center">
                        Field will be removed
                      </div>
                    )}
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
