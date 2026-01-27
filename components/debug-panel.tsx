"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Variable,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DebugStackFrame,
  NodeExecutionResult,
  ExecutionItem,
} from "@/types/debugger";

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  callStack: DebugStackFrame[];
  nodeResults: Record<string, NodeExecutionResult>;
  nodeOutputs: Record<string, ExecutionItem[]>;
  breakpoints: Set<string>;
  currentNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onToggleBreakpoint: (nodeId: string) => void;
}

export function DebugPanel({
  isOpen,
  onClose,
  callStack,
  nodeResults,
  nodeOutputs,
  breakpoints,
  currentNodeId,
  onSelectNode,
  onToggleBreakpoint,
}: DebugPanelProps) {
  const [expandedFrames, setExpandedFrames] = useState<Set<number>>(new Set([0]));

  if (!isOpen) return null;

  const toggleFrame = (index: number) => {
    const newExpanded = new Set(expandedFrames);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFrames(newExpanded);
  };

  const formatJson = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <Card className="w-80 h-full border-l rounded-none">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Debug Panel</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <Tabs defaultValue="callstack" className="flex-1">
        <TabsList className="w-full justify-start rounded-none border-b px-4">
          <TabsTrigger value="callstack" className="text-xs gap-1">
            <Layers className="h-3 w-3" />
            Call Stack
          </TabsTrigger>
          <TabsTrigger value="variables" className="text-xs gap-1">
            <Variable className="h-3 w-3" />
            Variables
          </TabsTrigger>
          <TabsTrigger value="breakpoints" className="text-xs gap-1">
            <Circle className="h-3 w-3 fill-red-500 text-red-500" />
            Breakpoints
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <TabsContent value="callstack" className="p-0 m-0">
            <div className="p-2 space-y-1">
              {callStack.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No call stack yet. Start debugging to see execution flow.
                </div>
              ) : (
                [...callStack].reverse().map((frame, index) => {
                  const isExpanded = expandedFrames.has(index);
                  const isCurrent = frame.nodeId === currentNodeId;

                  return (
                    <div
                      key={`${frame.nodeId}-${frame.timestamp}`}
                      className={cn(
                        "border rounded-md overflow-hidden",
                        isCurrent && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                      )}
                    >
                      <button
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50"
                        onClick={() => toggleFrame(index)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 shrink-0" />
                        )}

                        {frame.error ? (
                          <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                        )}

                        <span className="text-xs font-medium truncate flex-1">
                          {frame.nodeLabel}
                        </span>

                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {frame.nodeType}
                        </Badge>
                      </button>

                      {isExpanded && (
                        <div className="border-t px-2 py-2 space-y-2 bg-muted/30">
                          {frame.input && frame.input.length > 0 && (
                            <div>
                              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                                Input ({frame.input.length} items)
                              </div>
                              <pre className="text-[10px] bg-muted p-1 rounded overflow-auto max-h-24">
                                {formatJson(frame.input[0]?.json)}
                              </pre>
                            </div>
                          )}

                          {frame.output && frame.output.length > 0 && (
                            <div>
                              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                                Output ({frame.output.length} items)
                              </div>
                              <pre className="text-[10px] bg-muted p-1 rounded overflow-auto max-h-24">
                                {formatJson(frame.output[0]?.json)}
                              </pre>
                            </div>
                          )}

                          {frame.error && (
                            <div>
                              <div className="text-[10px] font-medium text-red-500 mb-1">
                                Error
                              </div>
                              <pre className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 p-1 rounded overflow-auto max-h-24">
                                {frame.error}
                              </pre>
                            </div>
                          )}

                          {frame.sourceLocation && (
                            <div>
                              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                                Source (Line {frame.sourceLocation.line})
                              </div>
                              <pre className="text-[10px] bg-muted p-1 rounded overflow-auto max-h-24 font-mono">
                                {frame.sourceLocation.code}
                              </pre>
                            </div>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-xs h-6"
                            onClick={() => onSelectNode(frame.nodeId)}
                          >
                            Select Node
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="variables" className="p-0 m-0">
            <div className="p-2 space-y-2">
              {currentNodeId && nodeOutputs[currentNodeId] ? (
                <div>
                  <div className="text-xs font-medium mb-2">
                    Current Node Output
                  </div>
                  <pre className="text-[10px] bg-muted p-2 rounded overflow-auto max-h-96 font-mono">
                    {formatJson(nodeOutputs[currentNodeId])}
                  </pre>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Pause at a breakpoint to inspect variables.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="breakpoints" className="p-0 m-0">
            <div className="p-2 space-y-1">
              {breakpoints.size === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No breakpoints set. Click on the red dot next to a node to add one.
                </div>
              ) : (
                Array.from(breakpoints).map((nodeId) => {
                  const result = nodeResults[nodeId];
                  return (
                    <div
                      key={nodeId}
                      className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/50"
                    >
                      <Circle className="h-3 w-3 fill-red-500 text-red-500 shrink-0" />
                      <span className="text-xs font-mono flex-1 truncate">
                        {result?.nodeLabel || nodeId.slice(0, 8)}...
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onToggleBreakpoint(nodeId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}
