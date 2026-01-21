"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";

// Execution item structure
interface ExecutionItem {
  json: Record<string, unknown>;
  binary?: Record<string, unknown>;
  pairedItem?: {
    item: number;
  };
}

interface NodeOutputPanelProps {
  selectedNodeId: string | null;
  nodeOutputs?: Record<
    string,
    {
      status: "pending" | "running" | "completed" | "failed";
      output?: ExecutionItem[] | unknown; // Support both items array format and legacy format
      error?: string;
      duration?: number;
    }
  >;
  onClose?: () => void;
}

export function NodeOutputPanel({
  selectedNodeId,
  nodeOutputs = {},
  onClose,
}: NodeOutputPanelProps) {
  const nodeOutput = selectedNodeId ? nodeOutputs[selectedNodeId] : null;

  const formatOutput = (output: unknown): string => {
    if (output === null) {
      return "null";
    }
    if (output === undefined) {
      return "undefined";
    }
    
    // Handle items array format
    if (Array.isArray(output) && output.length > 0 && output[0]?.json !== undefined) {
      const items = output as ExecutionItem[];
      if (items.length === 1) {
        // Single item - show just the json
        return JSON.stringify(items[0].json, null, 2);
      } else {
        // Multiple items - show array of json objects
        return JSON.stringify(items.map(item => item.json), null, 2);
      }
    }
    
    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return String(output);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-500">Running</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return null;
    }
  };

  if (!selectedNodeId) {
    return (
      <div className="h-full bg-muted/30 p-4 flex flex-col">
        {onClose && (
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <h3 className="text-sm font-semibold">Node Output</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent border hover:border-border"
              onClick={onClose}
              title="Close panel"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Select a node to view its output
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <Card className="rounded-none border-0 h-full flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Node Output</CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(nodeOutput?.status)}
              {onClose && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent border hover:border-border"
                  onClick={onClose}
                  title="Close panel"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {nodeOutput?.duration && (
            <p className="text-xs text-muted-foreground mt-1">
              Duration: {nodeOutput.duration}ms
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
          <Tabs defaultValue="output" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mb-2">
              <TabsTrigger value="output" className="flex-1">
                Output
              </TabsTrigger>
              {nodeOutput?.error && (
                <TabsTrigger value="error" className="flex-1">
                  Error
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent
              value="output"
              className="flex-1 overflow-auto m-0 p-4 mt-0"
            >
              {nodeOutput?.output !== undefined && nodeOutput.output !== null ? (
                <div className="space-y-2">
                  {Array.isArray(nodeOutput.output) && 
                   nodeOutput.output.length > 0 && 
                   nodeOutput.output[0]?.json !== undefined ? (
                    // Show items count
                    <>
                      <div className="text-xs text-muted-foreground mb-2">
                        {nodeOutput.output.length} item{(nodeOutput.output.length as number) !== 1 ? 's' : ''}
                      </div>
                      <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto">
                        {formatOutput(nodeOutput.output)}
                      </pre>
                    </>
                  ) : (
                    // Legacy format or single value
                    <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto">
                      {formatOutput(nodeOutput.output)}
                    </pre>
                  )}
                </div>
              ) : nodeOutput?.status === "running" ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Clock className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Running...</p>
                  </div>
                </div>
              ) : nodeOutput?.status === "pending" ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Not executed yet</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">No output available</p>
                </div>
              )}
            </TabsContent>
            {nodeOutput?.error && (
              <TabsContent
                value="error"
                className="flex-1 overflow-auto m-0 p-4 mt-0"
              >
                <pre className="text-xs font-mono bg-destructive/10 text-destructive p-3 rounded-md overflow-auto">
                  {nodeOutput.error}
                </pre>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

