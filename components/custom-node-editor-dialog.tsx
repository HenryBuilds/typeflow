"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  Save, 
  Puzzle, 
  Settings, 
  Code, 
  FileText,
  Loader2,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import type { INodeTypeDescription, INodeProperty } from "@/db/schema/custom-nodes";

interface CustomNodeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    id?: string;
    description: INodeTypeDescription;
    executeCode: string;
    typeDefinitions?: string;
  };
  onSave: (data: {
    description: INodeTypeDescription;
    executeCode: string;
    typeDefinitions?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_DESCRIPTION: INodeTypeDescription = {
  displayName: "My Custom Node",
  name: "myCustomNode",
  group: ["custom"],
  version: 1,
  description: "A custom node",
  icon: "Puzzle",
  color: "#6366f1",
  inputs: ["main"],
  outputs: ["main"],
  credentials: [],
  properties: [],
};

const DEFAULT_EXECUTE_CODE = `// typeflow-style execute function
// Available context:
// - $input: Array of input items
// - $item(index): Get specific input item
// - getNodeParameter(name, itemIndex): Get configured parameter value
// - getCredentials(name): Get decrypted credentials

const items = $input.all();
const results = [];

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  
  // Your custom logic here
  results.push({
    json: {
      ...item.json,
      processed: true,
    }
  });
}

return results;
`;

const PROPERTY_TYPES = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "options", label: "Options (Dropdown)" },
  { value: "json", label: "JSON" },
];

export function CustomNodeEditorDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
  isLoading = false,
}: CustomNodeEditorDialogProps) {
  const [description, setDescription] = useState<INodeTypeDescription>(
    initialData?.description || DEFAULT_DESCRIPTION
  );
  const [executeCode, setExecuteCode] = useState(
    initialData?.executeCode || DEFAULT_EXECUTE_CODE
  );
  const [typeDefinitions, setTypeDefinitions] = useState(
    initialData?.typeDefinitions || ""
  );
  const [activeTab, setActiveTab] = useState("description");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        description,
        executeCode,
        typeDefinitions: typeDefinitions || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save custom node:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateDescription = (updates: Partial<INodeTypeDescription>) => {
    setDescription((prev) => ({ ...prev, ...updates }));
  };

  const addProperty = () => {
    const newProperty: INodeProperty = {
      displayName: "New Property",
      name: `property${description.properties.length + 1}`,
      type: "string",
      default: "",
      description: "",
    };
    updateDescription({
      properties: [...description.properties, newProperty],
    });
  };

  const updateProperty = (index: number, updates: Partial<INodeProperty>) => {
    const newProperties = [...description.properties];
    newProperties[index] = { ...newProperties[index], ...updates };
    updateDescription({ properties: newProperties });
  };

  const removeProperty = (index: number) => {
    updateDescription({
      properties: description.properties.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" style={{ color: description.color }} />
            {initialData?.id ? "Edit Custom Node" : "Create Custom Node"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="description" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Description
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Properties
              {description.properties.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1">
                  {description.properties.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="execute" className="flex items-center gap-1">
              <Code className="h-4 w-4" />
              Execute Code
            </TabsTrigger>
            <TabsTrigger value="types" className="flex items-center gap-1">
              <Code className="h-4 w-4" />
              Types
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            {/* Description Tab */}
            <TabsContent value="description" className="h-full m-0">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={description.displayName}
                        onChange={(e) => updateDescription({ displayName: e.target.value })}
                        placeholder="My Custom Node"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Internal Name (alphanumeric)</Label>
                      <Input
                        value={description.name}
                        onChange={(e) => updateDescription({ name: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })}
                        placeholder="myCustomNode"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description.description}
                      onChange={(e) => updateDescription({ description: e.target.value })}
                      placeholder="What does this node do?"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={description.color || "#6366f1"}
                          onChange={(e) => updateDescription({ color: e.target.value })}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          value={description.color || "#6366f1"}
                          onChange={(e) => updateDescription({ color: e.target.value })}
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={description.group[0] || "custom"}
                        onChange={(e) => updateDescription({ group: [e.target.value] })}
                        placeholder="custom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Version</Label>
                      <Input
                        type="number"
                        value={description.version}
                        onChange={(e) => updateDescription({ version: parseInt(e.target.value) || 1 })}
                        min={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label>Has Input</Label>
                        <p className="text-xs text-muted-foreground">Receives data from previous nodes</p>
                      </div>
                      <Checkbox
                        checked={description.inputs.includes("main")}
                        onCheckedChange={(checked: boolean) => 
                          updateDescription({ inputs: checked ? ["main"] : [] })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label>Has Output</Label>
                        <p className="text-xs text-muted-foreground">Sends data to next nodes</p>
                      </div>
                      <Checkbox
                        checked={description.outputs.includes("main")}
                        onCheckedChange={(checked: boolean) => 
                          updateDescription({ outputs: checked ? ["main"] : [] })
                        }
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="h-full m-0">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Define configurable parameters for this node
                    </p>
                    <Button onClick={addProperty} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Property
                    </Button>
                  </div>

                  {description.properties.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No properties defined. Click "Add Property" to create one.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {description.properties.map((prop, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex justify-between items-start">
                            <Badge variant="outline">{prop.type}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProperty(index)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Display Name</Label>
                              <Input
                                value={prop.displayName}
                                onChange={(e) => updateProperty(index, { displayName: e.target.value })}
                                placeholder="API Key"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Property Name</Label>
                              <Input
                                value={prop.name}
                                onChange={(e) => updateProperty(index, { name: e.target.value })}
                                placeholder="apiKey"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={prop.type}
                                onValueChange={(value) => updateProperty(index, { type: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PROPERTY_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Default Value</Label>
                              <Input
                                value={String(prop.default || "")}
                                onChange={(e) => updateProperty(index, { default: e.target.value })}
                                placeholder="Default value"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={prop.description || ""}
                              onChange={(e) => updateProperty(index, { description: e.target.value })}
                              placeholder="Help text for this parameter"
                            />
                          </div>

                          {prop.type === "options" && (
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Options (JSON array: {`[{"name": "Label", "value": "value"}]`})
                              </Label>
                              <Textarea
                                value={JSON.stringify(prop.options || [], null, 2)}
                                onChange={(e) => {
                                  try {
                                    const options = JSON.parse(e.target.value);
                                    updateProperty(index, { options });
                                  } catch {
                                    // Invalid JSON, ignore
                                  }
                                }}
                                rows={3}
                                className="font-mono text-xs"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Execute Code Tab */}
            <TabsContent value="execute" className="h-full m-0">
              <div className="h-[400px] border rounded-lg overflow-hidden">
                <CodeMirror
                  value={executeCode}
                  onChange={setExecuteCode}
                  theme={vscodeDark}
                  extensions={[javascript({ typescript: true })]}
                  height="100%"
                  style={{ height: "100%" }}
                />
              </div>
            </TabsContent>

            {/* Types Tab */}
            <TabsContent value="types" className="h-full m-0">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Optional: Define TypeScript types for better autocomplete
                </p>
                <div className="h-[370px] border rounded-lg overflow-hidden">
                  <CodeMirror
                    value={typeDefinitions}
                    onChange={setTypeDefinitions}
                    theme={vscodeDark}
                    extensions={[javascript({ typescript: true })]}
                    height="100%"
                    style={{ height: "100%" }}
                    placeholder="// Optional type definitions..."
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Node
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
