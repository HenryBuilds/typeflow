"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SplitSquareVertical } from "lucide-react";
import { ExpressionInput } from "@/components/ui/expression-input";
import { InputDataItem } from "./types";
import { NodeDialogLayout } from "./node-dialog-layout";

interface SplitOutNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId?: string;
  initialConfig?: {
    fieldToSplit?: string;
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: { fieldToSplit: string } }) => void;
}

export function SplitOutNodeDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialConfig,
  initialLabel = "Split Out",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: SplitOutNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [fieldToSplit, setFieldToSplit] = useState(initialConfig?.fieldToSplit || "");

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setFieldToSplit(initialConfig?.fieldToSplit || "");
    }
  }, [open, initialLabel, initialConfig]);

  const handleSave = () => {
    onSave({
      label: label.trim() || "Split Out",
      config: {
        fieldToSplit: fieldToSplit.trim(),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NodeDialogLayout
        title="Configure Split Out"
        icon={<SplitSquareVertical className="h-5 w-5 text-gray-500" />}
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
              placeholder="Split Out"
            />
          </div>

          <div>
            <Label htmlFor="fieldToSplit">Field to Split</Label>
            <ExpressionInput
              value={fieldToSplit}
              onChange={setFieldToSplit}
              placeholder="e.g., $json.items or $json.results"
              inputData={inputData}
              sourceNodeLabels={sourceNodeLabels}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The array field that will be split into separate items
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
