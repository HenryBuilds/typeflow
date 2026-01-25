"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WaitNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    duration?: number;
    unit?: "seconds" | "minutes";
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { duration: number; unit: "seconds" | "minutes" } }) => void;
}

export function WaitNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "Wait",
  onSave,
}: WaitNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [duration, setDuration] = useState(initialConfig?.duration || 5);
  const [unit, setUnit] = useState<"seconds" | "minutes">(initialConfig?.unit || "seconds");

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setDuration(initialConfig?.duration || 5);
      setUnit(initialConfig?.unit || "seconds");
    }
  }, [open, initialLabel, initialConfig]);

  const handleSave = () => {
    onSave({
      label: label.trim() || "Wait",
      config: {
        duration: Math.max(1, duration),
        unit,
      },
    });
    onOpenChange(false);
  };

  const maxDuration = unit === "minutes" ? 5 : 300;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Configure Wait
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Wait"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={maxDuration}
                value={duration}
                onChange={(e) => setDuration(Math.min(maxDuration, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as "seconds" | "minutes")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Maximum wait time: 5 minutes (300 seconds)
          </p>

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
