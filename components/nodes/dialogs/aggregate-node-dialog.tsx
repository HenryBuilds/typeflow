"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers } from "lucide-react";

interface AggregateNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    outputField?: string;
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { outputField: string } }) => void;
}

export function AggregateNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "Aggregate",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-500" />
            Configure Aggregate
          </DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
