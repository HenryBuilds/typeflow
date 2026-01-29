"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Puzzle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpressionInput } from "@/components/ui/expression-input";

interface ExternalNodeInfo {
  name: string;
  displayName: string;
  description?: string;
  properties?: Array<{
    displayName: string;
    name: string;
    type: string;
    default?: unknown;
    description?: string;
    options?: Array<{ name: string; value: string }>;
    required?: boolean;
  }>;
}

interface InputDataItem {
  sourceNodeId: string;
  output: unknown;
  sourceNodeLabel?: string;
}

interface ExternalNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  nodeInfo?: ExternalNodeInfo;
  initialConfig?: Record<string, unknown>;
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: Record<string, unknown> }) => void;
}

export function ExternalNodeDialog({
  open,
  onOpenChange,
  nodeId,
  nodeInfo,
  initialConfig,
  initialLabel = "External Node",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: ExternalNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [config, setConfig] = useState<Record<string, unknown>>(initialConfig || {});

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      // Initialize config with defaults
      const initialValues: Record<string, unknown> = { ...initialConfig };
      nodeInfo?.properties?.forEach((prop) => {
        if (initialValues[prop.name] === undefined && prop.default !== undefined) {
          initialValues[prop.name] = prop.default;
        }
      });
      setConfig(initialValues);
    }
  }, [open, initialLabel, initialConfig, nodeInfo]);

  const updateConfig = (name: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave({
      label: label.trim() || nodeInfo?.displayName || "External Node",
      config,
    });
    onOpenChange(false);
  };

  const renderPropertyInput = (prop: NonNullable<ExternalNodeInfo["properties"]>[0]) => {
    const value = config[prop.name];

    switch (prop.type) {
      case "string":
        return (
          <ExpressionInput
            value={String(value || "")}
            onChange={(v) => updateConfig(prop.name, v)}
            placeholder={prop.description || `Enter ${prop.displayName}`}
            inputData={inputData}
            sourceNodeLabels={sourceNodeLabels}
            type="string"
          />
        );

      case "number":
        return (
          <ExpressionInput
            value={String(value || "")}
            onChange={(v) => {
              // If it's an expression, store as string
              if (v.startsWith("={{")) {
                updateConfig(prop.name, v);
              } else {
                updateConfig(prop.name, parseFloat(v) || 0);
              }
            }}
            placeholder={prop.description || `Enter ${prop.displayName}`}
            inputData={inputData}
            sourceNodeLabels={sourceNodeLabels}
            type="number"
          />
        );

      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={prop.name}
              checked={Boolean(value)}
              onCheckedChange={(checked) => updateConfig(prop.name, checked)}
            />
            <label htmlFor={prop.name} className="text-sm text-muted-foreground">
              {prop.description || `Enable ${prop.displayName}`}
            </label>
          </div>
        );

      case "options":
        return (
          <Select
            value={String(value || "")}
            onValueChange={(v) => updateConfig(prop.name, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${prop.displayName}`} />
            </SelectTrigger>
            <SelectContent>
              {prop.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "json":
        return (
          <ExpressionInput
            value={typeof value === "string" ? value : JSON.stringify(value || {}, null, 2)}
            onChange={(v) => {
              // If it's an expression, store as string
              if (v.startsWith("={{")) {
                updateConfig(prop.name, v);
              } else {
                try {
                  updateConfig(prop.name, JSON.parse(v));
                } catch {
                  updateConfig(prop.name, v);
                }
              }
            }}
            placeholder={prop.description || "Enter JSON"}
            inputData={inputData}
            sourceNodeLabels={sourceNodeLabels}
            type="json"
          />
        );

      default:
        return (
          <ExpressionInput
            value={String(value || "")}
            onChange={(v) => updateConfig(prop.name, v)}
            placeholder={prop.description || `Enter ${prop.displayName}`}
            inputData={inputData}
            sourceNodeLabels={sourceNodeLabels}
          />
        );
    }
  };

  const properties = nodeInfo?.properties || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-purple-500" />
            Configure {nodeInfo?.displayName || "External Node"}
          </DialogTitle>
          <DialogDescription>
            Configure the properties for this node. Use the expression button to reference data from previous nodes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Node Label */}
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={nodeInfo?.displayName || "External Node"}
            />
          </div>

          {nodeInfo?.description && (
            <p className="text-sm text-muted-foreground">{nodeInfo.description}</p>
          )}

          {/* Properties */}
          {properties.length > 0 ? (
            <div className="space-y-4">
              <Label className="text-muted-foreground">Properties</Label>
              {properties.map((prop) => (
                <div key={prop.name} className="space-y-1.5">
                  <Label htmlFor={prop.name}>
                    {prop.displayName}
                    {prop.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderPropertyInput(prop)}
                  {prop.description && prop.type !== "boolean" && (
                    <p className="text-xs text-muted-foreground">{prop.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              This node has no configurable properties.
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
