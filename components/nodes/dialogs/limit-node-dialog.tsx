"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hash } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InputDataItem } from "./types";
import { NodeDialogLayout } from "./node-dialog-layout";

interface LimitNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId?: string;
  initialConfig?: {
    limit?: number;
    keep?: "first" | "last";
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: { limit: number; keep: "first" | "last" } }) => void;
}

export function LimitNodeDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialConfig,
  initialLabel = "Limit",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: LimitNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [limit, setLimit] = useState(initialConfig?.limit || 10);
  const [keep, setKeep] = useState<"first" | "last">(initialConfig?.keep || "first");

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setLimit(initialConfig?.limit || 10);
      setKeep(initialConfig?.keep || "first");
    }
  }, [open, initialLabel, initialConfig]);

  const handleSave = () => {
    onSave({
      label: label.trim() || "Limit",
      config: {
        limit: Math.max(1, limit),
        keep,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NodeDialogLayout
        title="Configure Limit"
        icon={<Hash className="h-5 w-5 text-gray-500" />}
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
              placeholder="Limit"
            />
          </div>

          <div>
            <Label htmlFor="limit">Maximum Items</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Limit the number of items to process
            </p>
          </div>

          <div>
            <Label htmlFor="keep">Keep</Label>
            <Select value={keep} onValueChange={(v) => setKeep(v as "first" | "last")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first">First N items</SelectItem>
                <SelectItem value="last">Last N items</SelectItem>
              </SelectContent>
            </Select>
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
