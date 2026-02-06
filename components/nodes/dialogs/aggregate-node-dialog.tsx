"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers } from "lucide-react";
import { InputDataItem } from "./types";
import { NodeDialogLayout } from "./node-dialog-layout";

interface AggregateNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId?: string;
  initialConfig?: {
    outputField?: string;
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: { outputField: string } }) => void;
}

export function AggregateNodeDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialConfig,
  initialLabel = "Aggregate",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: AggregateNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [outputField, setOutputField] = useState(initialConfig?.outputField || "items");

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setOutputField(initialConfig?.outputField || "items");
    }
  }, [open, initialLabel, initialConfig]);

  const handleSave = () => {
    onSave({
      label: label.trim() || "Aggregate",
      config: {
        outputField: outputField.trim() || "items",
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NodeDialogLayout
        title="Configure Aggregate"
        icon={<Layers className="h-5 w-5 text-gray-500" />}
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
              placeholder="Aggregate"
            />
          </div>

          <div>
            <Label htmlFor="outputField">Output Field Name</Label>
            <Input
              id="outputField"
              value={outputField}
              onChange={(e) => setOutputField(e.target.value)}
              placeholder="items"
            />
            <p className="text-xs text-muted-foreground mt-1">
              All items will be aggregated into an array under this field name
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
