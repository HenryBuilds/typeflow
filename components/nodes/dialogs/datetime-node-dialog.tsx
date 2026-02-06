"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpressionInput } from "@/components/ui/expression-input";
import { InputDataItem } from "./types";
import { NodeDialogLayout } from "./node-dialog-layout";

interface DateTimeNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId?: string;
  initialConfig?: {
    operation?: "format" | "add" | "subtract" | "extract";
    inputField?: string;
    outputField?: string;
    format?: string;
    amount?: number;
    unit?: "days" | "hours" | "minutes" | "seconds";
    extractPart?: "year" | "month" | "day" | "hour" | "minute" | "second" | "dayOfWeek";
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: DateTimeNodeDialogProps["initialConfig"] }) => void;
}

export function DateTimeNodeDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialConfig,
  initialLabel = "DateTime",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: DateTimeNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [operation, setOperation] = useState<"format" | "add" | "subtract" | "extract">(
    initialConfig?.operation || "format"
  );
  const [inputField, setInputField] = useState(initialConfig?.inputField || "");
  const [outputField, setOutputField] = useState(initialConfig?.outputField || "");
  const [format, setFormat] = useState(initialConfig?.format || "YYYY-MM-DD");
  const [amount, setAmount] = useState(initialConfig?.amount || 1);
  const [unit, setUnit] = useState<"days" | "hours" | "minutes" | "seconds">(
    initialConfig?.unit || "days"
  );
  const [extractPart, setExtractPart] = useState<"year" | "month" | "day" | "hour" | "minute" | "second" | "dayOfWeek">(
    initialConfig?.extractPart || "year"
  );

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setOperation(initialConfig?.operation || "format");
      setInputField(initialConfig?.inputField || "");
      setOutputField(initialConfig?.outputField || "");
      setFormat(initialConfig?.format || "YYYY-MM-DD");
      setAmount(initialConfig?.amount || 1);
      setUnit(initialConfig?.unit || "days");
      setExtractPart(initialConfig?.extractPart || "year");
    }
  }, [open, initialLabel, initialConfig]);

  const handleSave = () => {
    onSave({
      label: label.trim() || "DateTime",
      config: {
        operation,
        inputField: inputField.trim(),
        outputField: outputField.trim(),
        format,
        amount,
        unit,
        extractPart,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NodeDialogLayout
        title="Configure DateTime"
        icon={<Calendar className="h-5 w-5 text-gray-500" />}
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
              placeholder="DateTime"
            />
          </div>

          <div>
            <Label htmlFor="operation">Operation</Label>
            <Select value={operation} onValueChange={(v) => setOperation(v as typeof operation)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="format">Format Date</SelectItem>
                <SelectItem value="add">Add Time</SelectItem>
                <SelectItem value="subtract">Subtract Time</SelectItem>
                <SelectItem value="extract">Extract Part</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="inputField">Input Field</Label>
            <ExpressionInput
              value={inputField}
              onChange={setInputField}
              placeholder="e.g., $json.createdAt"
              inputData={inputData}
              sourceNodeLabels={sourceNodeLabels}
            />
          </div>

          <div>
            <Label htmlFor="outputField">Output Field</Label>
            <Input
              id="outputField"
              value={outputField}
              onChange={(e) => setOutputField(e.target.value)}
              placeholder="e.g., formattedDate"
            />
          </div>

          {operation === "format" && (
            <div>
              <Label htmlFor="format">Format Pattern</Label>
              <Input
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm:ss"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Examples: YYYY-MM-DD, DD/MM/YYYY, HH:mm:ss
              </p>
            </div>
          )}

          {(operation === "add" || operation === "subtract") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as typeof unit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {operation === "extract" && (
            <div>
              <Label htmlFor="extractPart">Extract Part</Label>
              <Select value={extractPart} onValueChange={(v) => setExtractPart(v as typeof extractPart)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="minute">Minute</SelectItem>
                  <SelectItem value="second">Second</SelectItem>
                  <SelectItem value="dayOfWeek">Day of Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
