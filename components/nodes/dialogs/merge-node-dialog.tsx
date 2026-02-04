"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Merge } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpressionInput } from "@/components/ui/expression-input";
import { InputDataItem } from "./types";

interface MergeNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    mode?: "append" | "combine" | "mergeByKey";
    mergeKey?: string;
    inputCount?: number;
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: { mode: "append" | "combine" | "mergeByKey"; mergeKey?: string; inputCount?: number } }) => void;
}

export function MergeNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "Merge",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: MergeNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [mode, setMode] = useState<"append" | "combine" | "mergeByKey">(
    initialConfig?.mode || "append"
  );
  const [mergeKey, setMergeKey] = useState(initialConfig?.mergeKey || "");
  const [inputCount, setInputCount] = useState(initialConfig?.inputCount || 2);

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setMode(initialConfig?.mode || "append");
      setMergeKey(initialConfig?.mergeKey || "");
      setInputCount(initialConfig?.inputCount || 2);
    }
  }, [open, initialLabel, initialConfig]);

  const handleSave = () => {
    onSave({
      label: label.trim() || "Merge",
      config: {
        mode,
        mergeKey: mode === "mergeByKey" ? mergeKey.trim() : undefined,
        inputCount: inputCount,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 text-gray-500" />
            Configure Merge
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Merge"
            />
          </div>

          <div>
            <Label htmlFor="mode">Merge Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="append">Append (combine all items)</SelectItem>
                <SelectItem value="combine">Combine (merge objects)</SelectItem>
                <SelectItem value="mergeByKey">Merge by Key</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "append" && "Concatenates all items from all inputs into one array"}
              {mode === "combine" && "Merges objects from inputs, later values override earlier"}
              {mode === "mergeByKey" && "Matches items by key field and merges their properties"}
            </p>
          </div>

          {mode === "mergeByKey" && (
            <div>
              <Label htmlFor="mergeKey">Merge Key Field</Label>
              <ExpressionInput
                value={mergeKey}
                onChange={setMergeKey}
                placeholder="e.g., $json.id or $json.userId"
                inputData={inputData}
                sourceNodeLabels={sourceNodeLabels}
              />
            </div>
          )}

          <div>
            <Label htmlFor="inputCount">Number of Inputs</Label>
            <Input
              id="inputCount"
              type="number"
              min={2}
              max={10}
              value={inputCount}
              onChange={(e) => setInputCount(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              How many inputs to merge (2-10)
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

