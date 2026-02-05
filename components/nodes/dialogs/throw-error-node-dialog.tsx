"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

interface ThrowErrorNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: {
    errorMessage?: string;
    errorType?: string;
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { errorMessage: string; errorType: string } }) => void;
}

export function ThrowErrorNodeDialog({
  open,
  onOpenChange,
  initialConfig,
  initialLabel,
  onSave,
}: ThrowErrorNodeDialogProps) {
  const [label, setLabel] = useState("Throw Error");
  const [errorMessage, setErrorMessage] = useState("An error occurred");
  const [errorType, setErrorType] = useState("Error");

  // Sync state when dialog opens
  useEffect(() => {
    if (open) {
      setLabel(initialLabel || "Throw Error");
      setErrorMessage(initialConfig?.errorMessage || "An error occurred");
      setErrorType(initialConfig?.errorType || "Error");
    }
  }, [open, initialConfig, initialLabel]);

  const handleSave = () => {
    onSave({
      label,
      config: {
        errorMessage,
        errorType,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            Configure Throw Error
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="errorType">Error Type</Label>
            <Input
              id="errorType"
              value={errorType}
              onChange={(e) => setErrorType(e.target.value)}
              placeholder="Error"
            />
            <p className="text-xs text-muted-foreground">
              Name of the error (e.g., ValidationError, NotFoundError)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="errorMessage">Error Message</Label>
            <Input
              id="errorMessage"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="An error occurred"
            />
            <p className="text-xs text-muted-foreground">
              The error message that will be thrown
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
