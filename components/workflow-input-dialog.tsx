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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Plus, Trash2 } from "lucide-react";

interface FieldDefinition {
  name: string;
  type: string;
  description?: string;
}

interface WorkflowInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: {
    fields?: FieldDefinition[];
  };
  initialLabel?: string;
  onSave: (data: {
    label: string;
    config: {
      fields: FieldDefinition[];
    };
  }) => void;
}

export function WorkflowInputDialog({
  open,
  onOpenChange,
  initialConfig,
  initialLabel = "Workflow Input",
  onSave,
}: WorkflowInputDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [fields, setFields] = useState<FieldDefinition[]>(initialConfig?.fields || []);

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setFields(initialConfig?.fields || []);
    }
  }, [open, initialLabel, initialConfig]);

  const addField = () => {
    setFields([...fields, { name: "", type: "any", description: "" }]);
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
      label: label.trim() || "Workflow Input",
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
            <Download className="h-5 w-5" />
            Configure Workflow Input
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Workflow Input"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Expected Input Fields</Label>
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
              Define which fields this workflow expects to receive when called as a subworkflow.
            </p>

            {fields.length === 0 ? (
              <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
                No fields defined. The workflow will accept any input data.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {fields.map((field, index) => (
                  <div key={index} className="flex gap-2 items-start p-2 border rounded-md bg-muted/30">
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
                      <Input
                        placeholder="Description (optional)"
                        value={field.description || ""}
                        onChange={(e) => updateField(index, { description: e.target.value })}
                        className="text-xs"
                      />
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
                ))}
              </div>
            )}
          </div>

          {fields.length > 0 && (
            <div className="space-y-2">
              <Label>Generated Type</Label>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
{`interface WorkflowInput {
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
