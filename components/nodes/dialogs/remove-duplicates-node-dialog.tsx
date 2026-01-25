"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";

interface RemoveDuplicatesNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    field?: string;
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { field: string } }) => void;
}

export function RemoveDuplicatesNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "Remove Duplicates",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-gray-500" />
            Configure Remove Duplicates
          </DialogTitle>
        </DialogHeader>
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
            <Input
              id="field"
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="e.g., id or data.email"
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
      </DialogContent>
    </Dialog>
  );
}
