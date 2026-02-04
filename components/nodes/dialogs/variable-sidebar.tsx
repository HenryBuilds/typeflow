"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronRight, ChevronDown, PanelLeftClose, Check, Database, Key, Copy } from "lucide-react";
import { InputDataItem } from "./types";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface VariableSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputData: InputDataItem[];
  sourceNodeLabels: Record<string, string>;
  organizationId?: string;
  workflowId?: string;
  className?: string;
}

export function VariableSidebar({
  open,
  onOpenChange,
  inputData,
  sourceNodeLabels,
  organizationId,
  workflowId,
  className,
}: VariableSidebarProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Load credentials
  const { data: credentials } = trpc.credentials.list.useQuery(
    { organizationId: organizationId!, workflowId },
    { enabled: !!organizationId }
  );

  // Load environments
  const { data: environments } = trpc.environments.list.useQuery(
    { organizationId: organizationId!, workflowId },
    { enabled: !!organizationId }
  );

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Format value for display (compact)
  const formatValue = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === 'string') return `"${value.length > 30 ? value.substring(0, 30) + '...' : value}"`;
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        return str.length > 40 ? str.substring(0, 40) + '...' : str;
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  // Helper to build object tree recursively
  const buildObjectTree = useCallback((obj: Record<string, unknown>, prefix: string, depth = 0): any[] => {
    if (depth > 3) return [];
    
    return Object.keys(obj).map(key => {
      const value = obj[key];
      const path = `${prefix}.${key}`;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return {
          key,
          path,
          type: "object",
          value,
          children: buildObjectTree(value as Record<string, unknown>, path, depth + 1),
        };
      } else if (Array.isArray(value)) {
        return {
          key,
          path,
          type: "array",
          value,
          length: value.length,
        };
      } else {
        return {
          key,
          path,
          type: typeof value,
          value,
        };
      }
    });
  }, []);

  // Build tree structure from input data, grouped by source node
  const buildTree = useMemo(() => {
    if (!inputData || inputData.length === 0) return null;

    const treeBySource: Record<string, Record<string, any>> = {};
    
    inputData.forEach((input) => {
      const sourceNodeId = input.sourceNodeId || 'unknown';
      const output = input.output;
      const distance = input.distance ?? 1; // Default to 1 if not provided
      const sourceNodeLabel = input.sourceNodeLabel || sourceNodeLabels?.[sourceNodeId] || `Node ${sourceNodeId.substring(0, 8)}`;
      
      // Sanitize node label for use in variable names (remove spaces, special chars)
      const sanitizedLabel = sourceNodeLabel.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
      
      // Use node name prefix if distance > 1, otherwise use standard $json, $input
      const jsonPrefix = distance > 1 ? `$${sanitizedLabel}.json` : "$json";
      const inputPrefix = distance > 1 ? `$${sanitizedLabel}.input` : "$input";
      
      if (!treeBySource[sourceNodeId]) {
        treeBySource[sourceNodeId] = {};
      }
      
      const tree = treeBySource[sourceNodeId];
      
      if (Array.isArray(output) && output.length > 0 && output[0]?.json !== undefined) {
        const items = output as Array<{ json: unknown }>;
        
        // Build $json tree - show the complete object structure
        if (items[0]?.json && typeof items[0].json === 'object' && items[0].json !== null) {
          tree[jsonPrefix] = {
            type: "object",
            value: items[0].json,
            children: buildObjectTree(items[0].json as Record<string, unknown>, jsonPrefix),
            sourceNodeId: sourceNodeId,
          };
        }
        
        // Build $input tree
        tree[inputPrefix] = {
          type: "array",
          value: items.map(item => item.json),
          length: items.length,
          sourceNodeId: sourceNodeId,
          children: items.map((item, idx) => ({
            key: `[${idx}]`,
            path: `${inputPrefix}[${idx}].json`, // CodeNode uses this format, we match it.
            type: "object",
            value: item.json,
            children: typeof item.json === 'object' && item.json !== null 
              ? buildObjectTree(item.json as Record<string, unknown>, `${inputPrefix}[${idx}].json`)
              : null,
          })),
        };
        
        tree[`${inputPrefix}.length`] = {
          type: "number",
          value: items.length,
          sourceNodeId: sourceNodeId,
        };
      } else if (typeof output === 'object' && output !== null) {
        tree[jsonPrefix] = {
          type: "object",
          value: output,
          children: buildObjectTree(output as Record<string, unknown>, jsonPrefix),
          sourceNodeId: sourceNodeId,
        };
      } else {
        tree[jsonPrefix] = {
          type: typeof output,
          value: output,
          sourceNodeId: sourceNodeId,
        };
      }
    });
    
    return treeBySource;
  }, [inputData, buildObjectTree, sourceNodeLabels]);

  const TreeNode = ({ node, path, level = 0 }: { node: any; path: string; level?: number }) => {
    const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
    
    const hasChildren = node.children && node.children.length > 0;
    // Objects and arrays are always expandable, even if they have no children yet
    const isExpandable = node.type === "array" || node.type === "object" || hasChildren;
    const isLeaf = node.type !== "array" && node.type !== "object" && !hasChildren;
    // Only format value for leaf nodes to avoid unnecessary computation
    const displayValue = isLeaf ? formatValue(node.value) : null;
    
    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", path);
      e.dataTransfer.effectAllowed = "copy";
    };

    const handleClick = (e: React.MouseEvent) => {
      // Only handle click for expand/collapse, not for drag operations
      if (isExpandable) {
        e.stopPropagation();
        setExpanded(!expanded);
      } else {
        handleCopy(path);
      }
    };
    
    return (
      <div className="select-none">
        <div
          className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-accent/70 rounded-md cursor-grab transition-colors border border-transparent hover:border-border/50 group"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          draggable
          onDragStart={handleDragStart}
          onClick={handleClick}
        >
          {isExpandable ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform" />
            )
          ) : (
            <div className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <GripVertical className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 flex-shrink-0 transition-colors" />
          <code className="text-xs font-mono flex-shrink-0 font-medium">
            {node.key || path.split('.').pop() || path}
          </code>
          {/* Only show value for leaf nodes (primitives), NEVER for objects/arrays */}
          {isLeaf && (
            <span className="text-xs text-muted-foreground/80 ml-2 truncate flex-1 font-mono">
              {displayValue}
            </span>
          )}
          {/* Show array length for arrays */}
          {node.type === "array" && (
            <span className="text-xs text-muted-foreground/70 ml-2 font-mono">
              [{node.length || 0}]
            </span>
          )}
          
           {/* Copy action on hover for leafs */}
           {/* Added by request: ensure interactions are smooth */}
           {isLeaf && (
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              {copiedPath === path ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
           )}
        </div>
        {expanded && hasChildren && (
          <div>
            {node.children.map((child: any, idx: number) => (
              <TreeNode
                key={`${child.path}-${idx}`}
                node={child}
                path={child.path}
                level={level + 1}
              />
            ))}
          </div>
        )}
        {expanded && node.type === "array" && node.length !== undefined && node.children && node.children.length > 0 && (
          <div className="text-xs text-muted-foreground/60 ml-4 py-1 font-mono" style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}>
            {node.length} {node.length === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "border-r bg-muted/10 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 flex flex-col h-full", 
        open ? 'w-80 opacity-100' : 'w-0 opacity-0',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <h3 className="text-sm font-semibold">Variables</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onOpenChange(false)}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Credentials - Kept as convenience despite "strict" Copy, as it's additional value not conflicting logic */}
        {credentials && credentials.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1 flex items-center gap-1">
              <Key className="h-3 w-3" /> Credentials
            </div>
            {credentials.map(cred => (
              <div 
                key={cred.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", `$credentials.${cred.name}`);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => handleCopy(`$credentials.${cred.name}`)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono hover:bg-accent/70 rounded cursor-pointer group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                <span>{cred.name}</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  {copiedPath === `$credentials.${cred.name}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Environments */}
        {environments && environments.length > 0 && (
          <div className="space-y-1">
             <div className="text-xs font-semibold text-muted-foreground px-2 py-1 flex items-center gap-1">
              <Database className="h-3 w-3" /> Environment
            </div>
             {environments.map(env => (
              <div 
                key={env.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", `$env.${env.key}`);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => handleCopy(`$env.${env.key}`)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono hover:bg-accent/70 rounded cursor-pointer group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                <span>{env.key}</span>
                 <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  {copiedPath === `$env.${env.key}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hierarchical Tree View - Grouped by Source Node */}
        {buildTree && Object.keys(buildTree).length > 0 && (
          <div className="space-y-3">
            {Object.entries(buildTree).map(([sourceNodeId, tree]) => {
              const sourceLabel = sourceNodeLabels?.[sourceNodeId] || `Node ${sourceNodeId.substring(0, 8)}`;
              return (
                <div key={sourceNodeId} className="space-y-1">
                  <div className="text-xs font-semibold text-foreground/70 px-2 py-1.5 bg-muted/50 rounded-md border">
                    {sourceLabel}
                  </div>
                  <div className="pl-1">
                    {Object.entries(tree).map(([key, node]) => (
                      <TreeNode
                        key={`${sourceNodeId}-${key}`}
                        node={{ ...(node as Record<string, any>), key }}
                        path={key}
                        level={0}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(!buildTree || Object.keys(buildTree).length === 0) && (!credentials || credentials.length === 0) && (!environments || environments.length === 0) && (
          <div className="text-sm text-muted-foreground p-4 text-center">
            No variables available. Connect nodes to see their outputs here.
          </div>
        )}
      </div>
    </div>
  );
}
