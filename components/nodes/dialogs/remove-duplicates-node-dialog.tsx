"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { ExpressionInput } from "@/components/ui/expression-input";
import { InputDataItem } from "./types";
import { NodeDialogLayout } from "./node-dialog-layout";

interface RemoveDuplicatesNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId?: string;
  initialConfig?: {
    field?: string;
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: { field: string } }) => void;
}

export function RemoveDuplicatesNodeDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialConfig,
  initialLabel = "Remove Duplicates",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: RemoveDuplicatesNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [field, setField] = useState(initialConfig?.field || "");

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setField(initialConfig?.field || "");
    }
  }, [open, initialLabel, initialConfig]);

  const handleSave = () => {
    onSave({
      label: label.trim() || "Remove Duplicates",
      config: {
        field: field.trim(),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NodeDialogLayout
        title="Configure Remove Duplicates"
        icon={<Copy className="h-5 w-5 text-gray-500" />}
        sidebar={{
          inputData,
          sourceNodeLabels,
          organizationId,
        }}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Remove Duplicates"
            />
          </div>

          <div>
            <Label htmlFor="field">Comparison Field</Label>
            <ExpressionInput
              value={field}
              onChange={setField}
              placeholder="e.g., $json.id or $json.email"
              inputData={inputData}
              sourceNodeLabels={sourceNodeLabels}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Field used to compare items for duplicates. Leave empty to compare entire objects.
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
      </NodeDialogLayout>
    </Dialog>
  );
}
