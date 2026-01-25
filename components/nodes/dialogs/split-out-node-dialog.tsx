"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SplitSquareVertical } from "lucide-react";

interface SplitOutNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    fieldToSplit?: string;
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { fieldToSplit: string } }) => void;
}

export function SplitOutNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "Split Out",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SplitSquareVertical className="h-5 w-5 text-gray-500" />
            Configure Split Out
          </DialogTitle>
        </DialogHeader>
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
            <Input
              id="fieldToSplit"
              value={fieldToSplit}
              onChange={(e) => setFieldToSplit(e.target.value)}
              placeholder="e.g., data.items or results"
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
      </DialogContent>
    </Dialog>
  );
}
