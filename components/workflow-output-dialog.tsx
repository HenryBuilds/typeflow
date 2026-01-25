"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FieldDefinition {
  name: string;
  type: string;
  value?: string; // Expression like $json.fieldName or static value
  description?: string;
}

interface WorkflowOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: {
    fields?: FieldDefinition[];
  };
  initialLabel?: string;
  inputData?: Array<{
    sourceNodeId: string;
    output: unknown;
    distance?: number;
    sourceNodeLabel?: string;
  }>;
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: {
    label: string;
    config: {
      fields: FieldDefinition[];
    };
  }) => void;
}

export function WorkflowOutputDialog({
  open,
  onOpenChange,
  initialConfig,
  initialLabel = "Workflow Output",
  inputData,
  sourceNodeLabels,
  onSave,
}: WorkflowOutputDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [fields, setFields] = useState<FieldDefinition[]>(initialConfig?.fields || []);
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setFields(initialConfig?.fields || []);
    }
  }, [open, initialLabel, initialConfig]);

  // Build available variables from input data
  const availableVariables = useMemo(() => {
    if (!inputData || inputData.length === 0) return [];

    const variables: Array<{ path: string; value: unknown; type: string; sourceLabel: string }> = [];

    inputData.forEach((input) => {
      const sourceLabel = input.sourceNodeLabel || sourceNodeLabels?.[input.sourceNodeId] || `Node`;
      const output = input.output;

      const extractPaths = (obj: unknown, prefix: string, depth = 0): void => {
        if (depth > 3) return;

        if (Array.isArray(obj)) {
          if (obj.length > 0 && obj[0]?.json !== undefined) {
            // Items array format
            const firstItem = obj[0].json;
            if (typeof firstItem === 'object' && firstItem !== null) {
              Object.keys(firstItem).forEach(key => {
                const value = (firstItem as Record<string, unknown>)[key];
                const path = `${prefix}.${key}`;
                variables.push({ path, value, type: typeof value, sourceLabel });
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  extractPaths(value, path, depth + 1);
                }
              });
            }
          }
        } else if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => {
            const value = (obj as Record<string, unknown>)[key];
            const path = `${prefix}.${key}`;
            variables.push({ path, value, type: typeof value, sourceLabel });
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              extractPaths(value, path, depth + 1);
            }
          });
        }
      };

      // Handle items array format
      if (Array.isArray(output) && output.length > 0 && output[0]?.json !== undefined) {
        extractPaths(output, "$json");
      } else if (typeof output === 'object' && output !== null) {
        extractPaths(output, "$json");
      }
    });

    return variables;
  }, [inputData, sourceNodeLabels]);

  const addField = () => {
    setFields([...fields, { name: "", type: "any", value: "", description: "" }]);
  };

  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Filter out empty field names
    const validFields = fields.filter(f => f.name.trim() !== "");
    onSave({
      label: label.trim() || "Workflow Output",
      config: {
        fields: validFields,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Configure Workflow Output
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Workflow Output"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Output Fields</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Field
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Define which fields this workflow returns when called as a subworkflow.
            </p>

            {fields.length === 0 ? (
              <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
                No fields defined. The workflow will return all data from the last node.
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {fields.map((field, index) => (
                  <div key={index} className="p-3 border rounded-md bg-muted/30 space-y-3">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Field name"
                            value={field.name}
                            onChange={(e) => updateField(index, { name: e.target.value })}
                            className="flex-1"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => updateField(index, { type: e.target.value })}
                            className="px-2 py-1 border rounded-md bg-background text-sm"
                          >
                            <option value="any">any</option>
                            <option value="string">string</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="object">object</option>
                            <option value="array">array</option>
                          </select>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(index)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Value picker */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Value</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. $json.fieldName or static value"
                          value={field.value || ""}
                          onChange={(e) => updateField(index, { value: e.target.value })}
                          className="flex-1 font-mono text-sm"
                        />
                        {availableVariables.length > 0 && (
                          <Popover
                            open={openPopoverIndex === index}
                            onOpenChange={(isOpen) => setOpenPopoverIndex(isOpen ? index : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="px-2"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="end">
                              <div className="p-2 border-b bg-muted/50">
                                <p className="text-xs font-medium">Select from previous nodes</p>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {availableVariables.map((variable, varIndex) => (
                                  <button
                                    key={varIndex}
                                    type="button"
                                    className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center justify-between gap-2"
                                    onClick={() => {
                                      updateField(index, { value: variable.path });
                                      setOpenPopoverIndex(null);
                                    }}
                                  >
                                    <code className="font-mono text-xs">{variable.path}</code>
                                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                      {variable.type}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {fields.length > 0 && (
            <div className="space-y-2">
              <Label>Generated Type</Label>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
{`interface WorkflowOutput {
${fields.filter(f => f.name.trim()).map(f => `  ${f.name}: ${f.type};${f.description ? ` // ${f.description}` : ''}`).join('\n')}
}`}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
