"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpressionInput } from "@/components/ui/expression-input";
import { InputDataItem } from "./types";

interface Header {
  key: string;
  value: string;
}

interface HttpRequestNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  initialConfig?: {
    url?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Header[];
    body?: string;
    responseType?: "json" | "text";
  };
  initialLabel?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  onSave: (data: { label: string; config: HttpRequestNodeDialogProps["initialConfig"] }) => void;
}

export function HttpRequestNodeDialog({
  open,
  onOpenChange,
  nodeId,
  initialConfig,
  initialLabel = "HTTP Request",
  inputData = [],
  sourceNodeLabels = {},
  onSave,
}: HttpRequestNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [url, setUrl] = useState(initialConfig?.url || "");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE" | "PATCH">(
    initialConfig?.method || "GET"
  );
  const [headers, setHeaders] = useState<Header[]>(
    initialConfig?.headers || [{ key: "", value: "" }]
  );
  const [body, setBody] = useState(initialConfig?.body || "");
  const [responseType, setResponseType] = useState<"json" | "text">(
    initialConfig?.responseType || "json"
  );

  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setUrl(initialConfig?.url || "");
      setMethod(initialConfig?.method || "GET");
      setHeaders(initialConfig?.headers || [{ key: "", value: "" }]);
      setBody(initialConfig?.body || "");
      setResponseType(initialConfig?.responseType || "json");
    }
  }, [open, initialLabel, initialConfig]);

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, updates: Partial<Header>) => {
    setHeaders(headers.map((h, i) => (i === index ? { ...h, ...updates } : h)));
  };

  const handleSave = () => {
    const validHeaders = headers.filter(h => h.key.trim());
    onSave({
      label: label.trim() || "HTTP Request",
      config: {
        url: url.trim(),
        method,
        headers: validHeaders,
        body: ["POST", "PUT", "PATCH"].includes(method) ? body : undefined,
        responseType,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-500" />
            Configure HTTP Request
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="HTTP Request"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label htmlFor="method">Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label htmlFor="url">URL</Label>
              <ExpressionInput
                value={url}
                onChange={setUrl}
                placeholder="https://api.example.com/endpoint or $json.url"
                inputData={inputData}
                sourceNodeLabels={sourceNodeLabels}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Headers</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHeader}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Header
              </Button>
            </div>
            <div className="space-y-2">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Header name"
                    value={header.key}
                    onChange={(e) => updateHeader(index, { key: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex-1">
                    <ExpressionInput
                      value={header.value}
                      onChange={(v) => updateHeader(index, { value: v })}
                      placeholder="Value or $json.token"
                      inputData={inputData}
                      sourceNodeLabels={sourceNodeLabels}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHeader(index)}
                    className="hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {["POST", "PUT", "PATCH"].includes(method) && (
            <div>
              <Label htmlFor="body">Request Body (JSON)</Label>
              <ExpressionInput
                value={body}
                onChange={setBody}
                placeholder='{"key": "value"} or $json.data'
                inputData={inputData}
                sourceNodeLabels={sourceNodeLabels}
                type="json"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use expression mode to reference data from previous nodes
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="responseType">Response Type</Label>
            <Select value={responseType} onValueChange={(v) => setResponseType(v as typeof responseType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="text">Text</SelectItem>
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
      </DialogContent>
    </Dialog>
  );
}

