"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { autocompletion, completionKeymap, acceptCompletion, completionStatus, currentCompletions } from "@codemirror/autocomplete";
import { keymap, EditorView } from "@codemirror/view";
import { indentWithTab, indentMore } from "@codemirror/commands";
import { Prec } from "@codemirror/state";
import { linter } from "@codemirror/lint";
import { GripVertical, ChevronRight, ChevronDown, ChevronLeft, PanelLeftClose, PanelLeftOpen, FileType, Code2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createTypeScriptLinter } from "@/lib/typescript-linter";
import { trpc } from "@/lib/trpc";

interface CodeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  organizationId?: string; // Organization ID for loading credentials
  initialCode?: string;
  initialLabel?: string;
  inputData?: Array<{
    sourceNodeId: string;
    output: unknown;
    distance?: number;
    sourceNodeLabel?: string;
  }>;
  sourceNodeLabels?: Record<string, string>; // Map of nodeId to label
  typeDefinitions?: string; // Global type definitions
  packageTypeDefinitions?: string; // Type definitions from installed packages
  installedPackages?: Array<{ name: string; version: string }>; // List of installed packages
  existingNodeLabels?: string[]; // List of existing node labels for uniqueness check
  utilities?: Array<{ // Utilities nodes with their functions
    label: string;
    functions: string[]; // List of exported function names
  }>;
  onSave: (data: { code: string; label: string }) => void;
}

export function CodeEditorDialog({
  open,
  onOpenChange,
  nodeId,
  organizationId,
  initialCode = "",
  initialLabel = "Code Node",
  inputData,
  sourceNodeLabels,
  typeDefinitions,
  packageTypeDefinitions,
  utilities = [],
  installedPackages = [],
  existingNodeLabels = [],
  onSave,
}: CodeEditorDialogProps) {
  const [code, setCode] = useState(initialCode);
  const [label, setLabel] = useState(initialLabel);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<{ view: any } | null>(null);

  // Load credentials for autocomplete
  const { data: credentials } = trpc.credentials.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId && open }
  );
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [editorHeight, setEditorHeight] = useState(700);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [typesPopoverOpen, setTypesPopoverOpen] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  
  // Check if label is duplicate (case-insensitive)
  const isDuplicateLabel = useMemo(() => {
    const trimmedLabel = label.trim().toLowerCase();
    return existingNodeLabels.some(
      existingLabel => existingLabel.toLowerCase() === trimmedLabel
    );
  }, [label, existingNodeLabels]);

  // Extract actual values from input data
  const extractFieldPaths = (obj: unknown, prefix = "$json", depth = 0): Array<{ path: string; value: unknown; type: string }> => {
    if (depth > 3) return []; // Limit depth to avoid too many items
    
    const fields: Array<{ path: string; value: unknown; type: string }> = [];
    
    if (obj === null || obj === undefined) {
      return [{ path: prefix, value: obj, type: typeof obj }];
    }
    
    if (Array.isArray(obj)) {
      // Handle items array format
      if (obj.length > 0 && obj[0]?.json !== undefined) {
        const firstItem = obj[0].json;
        if (typeof firstItem === 'object' && firstItem !== null) {
          Object.keys(firstItem).forEach(key => {
            const value = (firstItem as Record<string, unknown>)[key];
            fields.push({
              path: `${prefix}.${key}`,
              value,
              type: Array.isArray(value) ? 'array' : typeof value,
            });
            // Recursively extract nested objects
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              fields.push(...extractFieldPaths(value, `${prefix}.${key}`, depth + 1));
            }
          });
        }
      } else {
        fields.push({ path: prefix, value: obj, type: 'array' });
      }
    } else if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const value = (obj as Record<string, unknown>)[key];
        fields.push({
          path: `${prefix}.${key}`,
          value,
          type: Array.isArray(value) ? 'array' : typeof value,
        });
        // Recursively extract nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          fields.push(...extractFieldPaths(value, `${prefix}.${key}`, depth + 1));
        }
      });
    } else {
      fields.push({ path: prefix, value: obj, type: typeof obj });
    }
    
    return fields;
  };

  // Get actual input values from all previous nodes
  const inputFields = useMemo(() => {
    if (!inputData || inputData.length === 0) return [];
    
    const allFields: Array<{ path: string; value: unknown; type: string; sourceNodeId?: string }> = [];
    
    // Process all input data from all connected nodes
    inputData.forEach((input) => {
      const output = input.output;
      
      // Handle items array format
      if (Array.isArray(output) && output.length > 0 && output[0]?.json !== undefined) {
        const items = output as Array<{ json: unknown }>;
        
        // Extract fields from first item ($json)
        if (items[0]?.json) {
          const firstItemJson = items[0].json;
          if (typeof firstItemJson === 'object' && firstItemJson !== null) {
            allFields.push(...extractFieldPaths(firstItemJson, "$json").map(f => ({
              ...f,
              sourceNodeId: input.sourceNodeId,
            })));
          }
        }
        
        // Extract fields from all items in $input array
        items.forEach((item, itemIndex) => {
          if (item.json && typeof item.json === 'object' && item.json !== null) {
            const prefix = itemIndex === 0 ? "$json" : `$input[${itemIndex}].json`;
            allFields.push(...extractFieldPaths(item.json, prefix).map(f => ({
              ...f,
              sourceNodeId: input.sourceNodeId,
            })));
          }
        });
        
        // Also show $input array itself
        allFields.push({
          path: "$input",
          value: items.map(item => item.json),
          type: "array",
          sourceNodeId: input.sourceNodeId,
        });
        
        // Show $input.length
        allFields.push({
          path: "$input.length",
          value: items.length,
          type: "number",
          sourceNodeId: input.sourceNodeId,
        });
      } else if (typeof output === 'object' && output !== null) {
        // Handle plain object
        allFields.push(...extractFieldPaths(output, "$json").map(f => ({
          ...f,
          sourceNodeId: input.sourceNodeId,
        })));
      } else {
        // Handle primitive values
        allFields.push({
          path: "$json",
          value: output,
          type: typeof output,
          sourceNodeId: input.sourceNodeId,
        });
      }
    });
    
    return allFields;
  }, [inputData]);

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
            path: `${inputPrefix}[${idx}].json`,
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

  // Tree node component
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
      }
      // Don't insert on click - only on drag & drop
    };
    
    return (
      <div className="select-none">
        <div
          className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-accent/70 rounded-md cursor-move transition-colors border border-transparent hover:border-border/50 group"
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
          {/* Never show value for objects - they show their children instead */}
          {/* Show array length for arrays */}
          {node.type === "array" && (
            <span className="text-xs text-muted-foreground/70 ml-2 font-mono">
              [{node.length || 0}]
            </span>
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

  // Available variables for autocomplete and drag & drop
  const availableVariables = useMemo(() => {
    const credentialsList = credentials?.map(c => c.name).join(", ") || "No credentials available";
    const baseVars = [
      { name: "$credentials", description: `Available: ${credentialsList}`, example: "$credentials.MyDatabase.query(...)", value: undefined, type: "object" },
      { name: "$json", description: "First item's json from previous node", example: "$json.fieldName", value: undefined, type: "object" },
      { name: "$input", description: "Array of all items from previous node", example: "$input.map(...)", value: undefined, type: "array" },
      { name: "$inputItem", description: "Alias for $json", example: "$inputItem.fieldName", value: undefined, type: "object" },
      { name: "$inputAll", description: "Alias for $input", example: "$inputAll.length", value: undefined, type: "array" },
    ];
    
    // Add utilities variables
    const utilityVars = utilities.map(util => {
      const sanitizedLabel = util.label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
      const varName = `$${sanitizedLabel}`;
      const functionsList = util.functions.join(", ");
      return {
        name: varName,
        description: `Utility functions: ${functionsList}`,
        example: `${varName}.${util.functions[0] || 'functionName'}(...)`,
        value: undefined,
        type: "object",
      };
    });
    
    // Add actual field paths from input data with their values
    const fieldVars = inputFields.map(field => ({
      name: field.path,
      description: `Value: ${formatValue(field.value)}`,
      example: field.path,
      value: field.value,
      type: field.type,
      sourceNodeId: field.sourceNodeId,
    }));
    
    return [...baseVars, ...utilityVars, ...fieldVars];
  }, [inputFields, credentials, utilities]);

  // Type definition for parsed types
  type ParsedType = {
    name: string;
    kind: string;
    info: string;
    properties?: Array<{ name: string; type: string; required: boolean }>;
  };

  // Standard TypeScript types
  const standardTypes = useMemo((): ParsedType[] => [
    // Primitive types
    { name: 'string', kind: 'type', info: 'Primitive string type' },
    { name: 'number', kind: 'type', info: 'Primitive number type' },
    { name: 'boolean', kind: 'type', info: 'Primitive boolean type' },
    { name: 'null', kind: 'type', info: 'Null type' },
    { name: 'undefined', kind: 'type', info: 'Undefined type' },
    { name: 'any', kind: 'type', info: 'Any type (no type checking)' },
    { name: 'unknown', kind: 'type', info: 'Unknown type (type-safe any)' },
    { name: 'void', kind: 'type', info: 'Void type (no return value)' },
    { name: 'never', kind: 'type', info: 'Never type (unreachable)' },

    // Object types
    { name: 'object', kind: 'type', info: 'Object type' },
    { name: 'Object', kind: 'interface', info: 'Object constructor' },
    { name: 'Record', kind: 'type', info: 'Record<K, V> - object with keys of type K and values of type V' },
    { name: 'Partial', kind: 'type', info: 'Partial<T> - make all properties optional' },
    { name: 'Required', kind: 'type', info: 'Required<T> - make all properties required' },
    { name: 'Readonly', kind: 'type', info: 'Readonly<T> - make all properties readonly' },
    { name: 'Pick', kind: 'type', info: 'Pick<T, K> - pick subset of properties' },
    { name: 'Omit', kind: 'type', info: 'Omit<T, K> - omit subset of properties' },

    // Array types
    { name: 'Array', kind: 'interface', info: 'Array<T> - array type' },
    { name: 'ReadonlyArray', kind: 'interface', info: 'ReadonlyArray<T> - readonly array' },

    // Function types
    { name: 'Function', kind: 'interface', info: 'Function type' },

    // Promise types
    { name: 'Promise', kind: 'interface', info: 'Promise<T> - async operation result' },

    // Utility types
    { name: 'Exclude', kind: 'type', info: 'Exclude<T, U> - exclude types from union' },
    { name: 'Extract', kind: 'type', info: 'Extract<T, U> - extract types from union' },
    { name: 'NonNullable', kind: 'type', info: 'NonNullable<T> - exclude null and undefined' },
    { name: 'ReturnType', kind: 'type', info: 'ReturnType<T> - get function return type' },
    { name: 'Parameters', kind: 'type', info: 'Parameters<T> - get function parameters' },

    // Other common types
    { name: 'Date', kind: 'interface', info: 'Date object' },
    { name: 'Error', kind: 'interface', info: 'Error object' },
    { name: 'RegExp', kind: 'interface', info: 'Regular expression' },
    { name: 'Map', kind: 'interface', info: 'Map<K, V> - key-value map' },
    { name: 'Set', kind: 'interface', info: 'Set<T> - unique values set' },
  ], []);

  // Helper function to parse type definitions and extract properties
  const parseTypes = useCallback((source: string, sourceLabel: string): ParsedType[] => {
    const types: ParsedType[] = [];

    if (!source) return types;

    // Extract interface with properties: interface Name { prop: type; ... }
    const interfaceRegex = /(?:export\s+)?interface\s+([A-Z_]\w*)\s*(?:<[^>]*>)?\s*\{([^}]*)\}/gi;
    let match;
    while ((match = interfaceRegex.exec(source)) !== null) {
      const name = match[1];
      const body = match[2];

      // Avoid duplicates
      if (!types.some(t => t.name === name)) {
        // Extract properties from interface body
        const properties: Array<{ name: string; type: string; required: boolean }> = [];
        const propRegex = /(\w+)(\?)?:\s*([^;,\n]+)/g;
        let propMatch;
        while ((propMatch = propRegex.exec(body)) !== null) {
          properties.push({
            name: propMatch[1],
            type: propMatch[3].trim(),
            required: !propMatch[2], // No ? means required
          });
        }

        types.push({
          name,
          kind: 'interface',
          info: `Interface ${name} (${sourceLabel})`,
          properties,
        });
      }
    }

    // Extract type aliases with object types: type Name = { prop: type; ... }
    const typeRegex = /(?:export\s+)?type\s+([A-Z_]\w*)(?:\s*<[^>]*>)?\s*=\s*\{([^}]*)\}/gi;
    while ((match = typeRegex.exec(source)) !== null) {
      const name = match[1];
      const body = match[2];

      if (!types.some(t => t.name === name)) {
        // Extract properties from type body
        const properties: Array<{ name: string; type: string; required: boolean }> = [];
        const propRegex = /(\w+)(\?)?:\s*([^;,\n]+)/g;
        let propMatch;
        while ((propMatch = propRegex.exec(body)) !== null) {
          properties.push({
            name: propMatch[1],
            type: propMatch[3].trim(),
            required: !propMatch[2],
          });
        }

        types.push({
          name,
          kind: 'type',
          info: `Type ${name} (${sourceLabel})`,
          properties,
        });
      }
    }

    // Extract simple type aliases (non-object types)
    const simpleTypeRegex = /(?:export\s+)?type\s+([A-Z_]\w*)(?:\s*<[^>]*>)?\s*=\s*([^{][^;\n]+)/gi;
    while ((match = simpleTypeRegex.exec(source)) !== null) {
      const name = match[1];
      if (!types.some(t => t.name === name)) {
        types.push({
          name,
          kind: 'type',
          info: `Type ${name} (${sourceLabel})`,
        });
      }
    }

    // Extract enum names: enum Name { ... }
    const enumRegex = /(?:export\s+)?(?:const\s+)?enum\s+([A-Z_]\w*)/gi;
    while ((match = enumRegex.exec(source)) !== null) {
      const name = match[1];
      if (!types.some(t => t.name === name)) {
        types.push({
          name,
          kind: 'enum',
          info: `Enum ${name} (${sourceLabel})`,
        });
      }
    }

    // Extract class names: class Name { ... }
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+([A-Z_]\w*)/gi;
    while ((match = classRegex.exec(source)) !== null) {
      const name = match[1];
      if (!types.some(t => t.name === name)) {
        types.push({
          name,
          kind: 'class',
          info: `Class ${name} (${sourceLabel})`,
        });
      }
    }

    // Extract namespace/module names: namespace Name { ... } or declare module 'name' { ... }
    const namespaceRegex = /(?:export\s+)?(?:declare\s+)?namespace\s+([A-Z_]\w*)/gi;
    while ((match = namespaceRegex.exec(source)) !== null) {
      const name = match[1];
      if (!types.some(t => t.name === name)) {
        types.push({
          name,
          kind: 'namespace',
          info: `Namespace ${name} (${sourceLabel})`,
        });
      }
    }

    return types;
  }, []);

  // Parse type definitions to extract type names
  const definedTypes = useMemo(() => {
    
    const customTypes = parseTypes(typeDefinitions || '', 'global types');
    
    return customTypes;
  }, [typeDefinitions, parseTypes]);
  
  // Parse package type definitions
  const packageTypes = useMemo(() => {
    const pkgTypes = parseTypes(packageTypeDefinitions || '', 'installed packages');
    
    return pkgTypes;
  }, [packageTypeDefinitions, parseTypes]);
  
  // Combine all types: custom types, package types, then standard types (in priority order)
  const allTypes = useMemo(() => {
    // Remove duplicates, prioritizing earlier types (custom > package > standard)
    const seen = new Set<string>();
    const combined = [...definedTypes, ...packageTypes, ...standardTypes].filter(t => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    });
    
    
    return combined;
  }, [definedTypes, packageTypes, standardTypes]);

  // Combine type definitions with package type definitions
  const combinedTypeDefinitions = useMemo(() => {
    const parts: string[] = [];
    if (typeDefinitions) parts.push(typeDefinitions);
    if (packageTypeDefinitions) parts.push(packageTypeDefinitions);
    
    // Add credentials type definitions
    if (credentials && credentials.length > 0) {
      const credentialTypes = `
// Database Credential Types
interface PostgresCredential {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface MySQLCredential {
  query(sql: string, params?: any[]): Promise<[any[], any]>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface MongoDBCredential {
  collection(name: string): Promise<any>;
  getDb(): Promise<any>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface RedisCredential {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// Available Credentials
interface $Credentials {
${credentials.map(c => {
  const typeMap: Record<string, string> = {
    postgres: 'PostgresCredential',
    mysql: 'MySQLCredential',
    mongodb: 'MongoDBCredential',
    redis: 'RedisCredential',
  };
  const credType = typeMap[c.type] || 'any';
  return `  /** ${c.type} - ${c.description || 'No description'} */\n  ${c.name}: ${credType};`;
}).join('\n')}
}
declare const $credentials: $Credentials;
`;
      parts.push(credentialTypes);
    }
    
    // Add utilities type definitions
    if (utilities && utilities.length > 0) {
      const utilityTypes = `
// Utilities Type Definitions
${utilities.map(util => {
  const sanitizedLabel = util.label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  const varName = `$${sanitizedLabel}`;
  
  const functionDeclarations = util.functions.map(fn => 
    `  /** Utility function from ${util.label} */\n  ${fn}(...args: any[]): any;`
  ).join('\n');
  
  return `interface ${varName}Type {\n${functionDeclarations}\n}\ndeclare const ${varName}: ${varName}Type;`;
}).join('\n\n')}
`;
      parts.push(utilityTypes);
    }
    
    return parts.join('\n\n');
  }, [typeDefinitions, packageTypeDefinitions, credentials, utilities]);

  // Create TypeScript linter with combined type definitions
  const typeScriptLinter = useMemo(() => {
    return linter(createTypeScriptLinter(combinedTypeDefinitions));
  }, [combinedTypeDefinitions]);

  // Custom autocomplete for variables and types
  const customAutocomplete = useMemo(() => {
    return autocompletion({
      activateOnTyping: true,
      defaultKeymap: true,
      override: [
        // Autocomplete for $ variables
        (context) => {
          const word = context.matchBefore(/\$[\w_]*/);
          if (!word) return null;
          
          if (word.from === word.to && !context.explicit) return null;
          
          return {
            from: word.from,
            options: availableVariables.map(v => ({
              label: v.name,
              type: "variable",
              info: v.description,
              detail: v.example,
            })),
            validFor: /^\$[\w_]*$/,
          };
        },
        // Autocomplete for $credentials.{CredentialName}
        (context) => {
          const word = context.matchBefore(/\$credentials\.[\w_]*/);
          if (!word) return null;
          
          if (word.from === word.to && !context.explicit) return null;
          
          if (!credentials || credentials.length === 0) {
            return {
              from: word.from,
              options: [{
                label: "$credentials",
                type: "variable",
                info: "⚠️ No credentials configured. Go to Organization → Credentials to add one.",
              }],
            };
          }
          
          return {
            from: word.from + 13, // Length of "$credentials."
            options: credentials.map(c => ({
              label: c.name,
              type: "property",
              info: `${c.type} database (${c.description || 'No description'})`,
              detail: `$credentials.${c.name}.query(...)`,
            })),
            validFor: /^[\w_]*$/,
          };
        },
        // Autocomplete for $credentials.{CredentialName}.{method}
        (context) => {
          const word = context.matchBefore(/\$credentials\.[\w_]+\.[\w_]*/);
          if (!word) return null;
          
          // Extract credential name from word
          const match = word.text.match(/\$credentials\.([\w_]+)\./);
          if (!match) return null;
          
          const credentialName = match[1];
          const credential = credentials?.find(c => c.name === credentialName);
          
          if (!credential) {
            return {
              from: word.from,
              options: [{
                label: credentialName,
                type: "property",
                info: `⚠️ Credential "${credentialName}" not found. Available: ${credentials?.map(c => c.name).join(", ")}`,
              }],
            };
          }
          
          // Get methods based on credential type
          const methodsByType: Record<string, Array<{ label: string; detail: string; info: string }>> = {
            postgres: [
              { label: "query", detail: "query(sql: string, params?: any[])", info: "Execute a SQL query" },
              { label: "connect", detail: "connect()", info: "Manually connect to database" },
              { label: "disconnect", detail: "disconnect()", info: "Disconnect from database" },
            ],
            mysql: [
              { label: "query", detail: "query(sql: string, params?: any[])", info: "Execute a SQL query" },
              { label: "connect", detail: "connect()", info: "Manually connect to database" },
              { label: "disconnect", detail: "disconnect()", info: "Disconnect from database" },
            ],
            mongodb: [
              { label: "collection", detail: "collection(name: string)", info: "Get a collection" },
              { label: "getDb", detail: "getDb()", info: "Get database instance" },
              { label: "connect", detail: "connect()", info: "Manually connect to database" },
              { label: "disconnect", detail: "disconnect()", info: "Disconnect from database" },
            ],
            redis: [
              { label: "get", detail: "get(key: string)", info: "Get value by key" },
              { label: "set", detail: "set(key: string, value: string)", info: "Set key-value pair" },
              { label: "connect", detail: "connect()", info: "Manually connect to Redis" },
              { label: "disconnect", detail: "disconnect()", info: "Disconnect from Redis" },
            ],
          };
          
          const methods = methodsByType[credential.type] || [];
          
          const dotPosition = word.text.lastIndexOf('.');
          
          return {
            from: word.from + dotPosition + 1,
            options: methods.map(m => ({
              label: m.label,
              type: "method",
              detail: m.detail,
              info: m.info,
            })),
            validFor: /^[\w_]*$/,
          };
        },
        // Autocomplete for utilities $UtilityName.{function}
        (context) => {
          if (!utilities || utilities.length === 0) return null;
          
          const word = context.matchBefore(/\$[\w_]+\.[\w_]*/);
          if (!word) return null;
          
          // Skip if it's $credentials, $json, $input, etc.
          if (word.text.startsWith('$credentials') || 
              word.text.startsWith('$json') || 
              word.text.startsWith('$input')) {
            return null;
          }
          
          // Extract utility name from word
          const match = word.text.match(/\$([\w_]+)\./);
          if (!match) return null;
          
          const utilityName = match[1];
          
          // Check if this matches any utility node
          const utility = utilities.find(u => {
            const sanitizedLabel = u.label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
            return sanitizedLabel === utilityName;
          });
          
          // If no utility found, don't provide autocomplete (let other overrides handle it)
          if (!utility) {
            return null;
          }
          
          const dotPosition = word.text.lastIndexOf('.');
          
          return {
            from: word.from + dotPosition + 1,
            options: utility.functions.map(fn => ({
              label: fn,
              type: "function",
              detail: `${fn}(...)`,
              info: `Utility function from ${utility.label}`,
              boost: 99, // High priority for utility functions
            })),
            validFor: /^[\w_]*$/,
          };
        },
        // Autocomplete for custom types - show types in type positions
        (context) => {
          if (allTypes.length === 0) return null;
          
          const line = context.state.doc.lineAt(context.pos);
          const lineStart = line.from;
          const textBefore = line.text.slice(0, context.pos - lineStart);
          
          // Check for type position patterns (after : < as extends implements)
          const isAfterColon = /:\s*\w*$/.test(textBefore);
          const isAfterAngle = /<\s*\w*$/.test(textBefore);
          const isAfterAs = /\bas\s+\w*$/.test(textBefore);
          const isAfterExtends = /\bextends\s+\w*$/.test(textBefore);
          const isAfterImplements = /\bimplements\s+\w*$/.test(textBefore);
          
          const isTypePosition = isAfterColon || isAfterAngle || isAfterAs || isAfterExtends || isAfterImplements;
          
          if (isTypePosition) {
            // Try to match what the user has typed so far (could be lowercase or uppercase)
            const word = context.matchBefore(/\w+/);
            
            if (word || context.explicit) {
              const typedText = word ? word.text.toLowerCase() : '';
              const from = word ? word.from : context.pos;
              
              return {
                from,
                options: allTypes
                  .filter(t => !typedText || t.name.toLowerCase().startsWith(typedText))
                  .map(t => ({
                    label: t.name,
                    type: t.kind,
                    info: t.info,
                    // Priority: custom types (99) > package types (80) > standard types (50)
                    boost: definedTypes.some(dt => dt.name === t.name) ? 99 : 
                           packageTypes.some(pt => pt.name === t.name) ? 80 : 50,
                  })),
                validFor: /^\w*$/,
              };
            }
          }
          
          // For explicit trigger (Ctrl+Space) anywhere
          if (context.explicit) {
            // Don't show types after $variable. (let other overrides handle it)
            const beforeDot = context.matchBefore(/\$[\w_]+\.\w*/);
            if (beforeDot) return null;
            
            const word = context.matchBefore(/\w*/);
            const typedText = word ? word.text.toLowerCase() : '';
            const from = word && word.text ? word.from : context.pos;
            
            return {
              from,
              options: allTypes
                .filter(t => !typedText || t.name.toLowerCase().startsWith(typedText))
                .map(t => ({
                  label: t.name,
                  type: t.kind,
                  info: t.info,
                  boost: definedTypes.some(dt => dt.name === t.name) ? 99 : 
                         packageTypes.some(pt => pt.name === t.name) ? 80 : 50,
                })),
              validFor: /^\w*$/,
            };
          }
          
          return null;
        },
        // Autocomplete for import statements - suggest installed packages
        (context) => {
          if (installedPackages.length === 0) return null;
          
          const line = context.state.doc.lineAt(context.pos);
          const lineText = line.text;
          
          // Check if we're in an import statement
          const importMatch = lineText.match(/^import\s+.*\s+from\s+['"]([^'"]*)/);
          if (importMatch) {
            const packagePrefix = importMatch[1].toLowerCase();
            // Find the position of the opening quote, then add 1 to get the start of the package name
            const quoteMatch = lineText.match(/from\s+['"]/);
            if (!quoteMatch) return null;
            const quotePos = lineText.indexOf(quoteMatch[0]) + quoteMatch[0].length;
            const from = line.from + quotePos;
            
            return {
              from,
              options: installedPackages
                .filter(pkg => pkg.name.toLowerCase().startsWith(packagePrefix))
                .map(pkg => ({
                  label: pkg.name,
                  type: 'text',
                  info: `v${pkg.version} (installed)`,
                  detail: 'installed package',
                })),
              validFor: /^[\w@\/-]*$/,
            };
          }
          
          // Also trigger after typing 'from "' or "from '"
          const fromMatch = lineText.match(/from\s+['"]$/);
          if (fromMatch && context.pos === line.from + lineText.length) {
            return {
              from: context.pos,
              options: installedPackages.map(pkg => ({
                label: pkg.name,
                type: 'text',
                info: `v${pkg.version} (installed)`,
                detail: 'installed package',
              })),
            };
          }
          
          return null;
        },
        // Autocomplete for properties after variable (e.g., $Node_1.)
        (context) => {
          const propertyMatch = context.matchBefore(/\$[\w]+\.([\w]*)/);
          if (!propertyMatch) return null;
          
          const text = propertyMatch.text;
          const varName = text.match(/\$([\w]+)/)?.[0];
          
          if (!varName) return null;
          
          // Find the variable in buildTree to get available properties
          const properties: Array<{ label: string; type: string; info?: string }> = [];
          
          // Check if it's a node variable (e.g., $Node_1, $Trigger)
          if (buildTree && varName !== '$json' && varName !== '$input' && varName !== '$inputItem' && varName !== '$inputAll') {
            // Node variable - show .json and .input
            properties.push(
              { label: 'json', type: 'property', info: 'First item\'s JSON object' },
              { label: 'input', type: 'property', info: 'Array of all items' }
            );
          } else if (varName === '$json' || varName === '$inputItem') {
            // Show properties of the JSON object
            if (buildTree) {
              Object.entries(buildTree).forEach(([sourceNodeId, tree]) => {
                const jsonNode = tree['$json'];
                if (jsonNode && jsonNode.children) {
                  jsonNode.children.forEach((child: any) => {
                    properties.push({
                      label: child.key,
                      type: 'property',
                      info: `Type: ${child.type}`,
                    });
                  });
                }
              });
            }
          } else if (varName === '$input' || varName === '$inputAll') {
            // Array properties
            properties.push(
              { label: 'length', type: 'property', info: 'Number of items' },
              { label: 'map', type: 'method', info: 'Map over items' },
              { label: 'filter', type: 'method', info: 'Filter items' },
              { label: 'find', type: 'method', info: 'Find item' },
              { label: 'forEach', type: 'method', info: 'Iterate over items' }
            );
          }
          
          if (properties.length === 0) return null;
          
          // Calculate the position after the dot
          const dotPos = propertyMatch.from + text.lastIndexOf('.') + 1;
          
          return {
            from: dotPos,
            options: properties,
          };
        },
        // Autocomplete for object literals with type annotations
        // Example: const user: User = { <-- suggest User properties here
        (context) => {
          // Get more context - look at multiple lines before cursor
          const doc = context.state.doc;
          const pos = context.pos;

          // Get text from start of document to cursor (max 500 chars back for performance)
          const startPos = Math.max(0, pos - 500);
          const textBefore = doc.sliceString(startPos, pos);

          // Check if we're inside an object literal with a type annotation
          // Multi-line pattern: const x: TypeName = {
          //   ... (could be multiple lines)
          //   <cursor here>
          // Use [\s\S] instead of . with s flag for compatibility
          const typeAnnotationMatch = textBefore.match(/(?:const|let|var)\s+\w+\s*:\s*(\w+)\s*=\s*\{[^}]*$/);

          if (typeAnnotationMatch) {
            const typeName = typeAnnotationMatch[1];

            
            

            // Find the type in our parsed types
            const typeInfo = allTypes.find(t => t.name === typeName);

            

            if (typeInfo && typeInfo.properties && typeInfo.properties.length > 0) {
              

              // Get already defined properties in the object
              const objectContentMatch = textBefore.match(/\{([^}]*)$/);
              const objectContent = objectContentMatch ? objectContentMatch[1] : '';
              const definedProps = objectContent.match(/(\w+)\s*:/g)?.map(p => p.replace(':', '').trim()) || [];

              

              // Filter out already defined properties
              const availableProps = typeInfo.properties.filter(
                prop => !definedProps.includes(prop.name)
              );

              

              if (availableProps.length > 0) {
                const word = context.matchBefore(/\w*/);
                const from = word && word.text ? word.from : context.pos;

                return {
                  from,
                  options: availableProps.map(prop => ({
                    label: prop.name,
                    type: 'property',
                    detail: prop.type,
                    info: prop.required ? `Required property (${prop.type})` : `Optional property (${prop.type})`,
                    // Boost required properties
                    boost: prop.required ? 99 : 50,
                    // Apply the property with ": " suffix for better UX
                    apply: `${prop.name}: `,
                  })),
                  validFor: /^\w*$/,
                };
              }
            }
          }

          return null;
        },
        // CATCH-ALL OVERRIDE (MUST BE LAST): Provide useful suggestions for local variables
        // This shows array/object methods for any variable access
        (context) => {
          // Get the text before cursor to check what the user is typing
          const line = context.state.doc.lineAt(context.pos);
          const textBefore = line.text.slice(0, context.pos - line.from);

          // Check if we're typing after a dot (property access)
          const dotMatch = textBefore.match(/([\w]+)\.([\w]*)$/);

          if (dotMatch) {
            const objectName = dotMatch[1];
            const partialProperty = dotMatch[2];

            // Allow our custom overrides to handle $ variables
            if (objectName.startsWith('$') ||
                objectName === 'credentials' ||
                textBefore.includes('$credentials.')) {
              return null; // Let our custom overrides handle it
            }

            // For local variables, provide helpful array and object methods
            const commonArrayMethods = [
              { label: 'map', type: 'method', info: 'map<U>(callbackfn: (value, index, array) => U): U[]', boost: 99 },
              { label: 'filter', type: 'method', info: 'filter(predicate: (value, index, array) => boolean): T[]', boost: 98 },
              { label: 'find', type: 'method', info: 'find(predicate: (value, index, obj) => boolean): T | undefined', boost: 97 },
              { label: 'findIndex', type: 'method', info: 'findIndex(predicate: (value, index, obj) => boolean): number', boost: 90 },
              { label: 'forEach', type: 'method', info: 'forEach(callbackfn: (value, index, array) => void): void', boost: 96 },
              { label: 'reduce', type: 'method', info: 'reduce<U>(callbackfn: (prev, curr, idx, arr) => U, init: U): U', boost: 95 },
              { label: 'some', type: 'method', info: 'some(predicate: (value, index, array) => boolean): boolean', boost: 85 },
              { label: 'every', type: 'method', info: 'every(predicate: (value, index, array) => boolean): boolean', boost: 84 },
              { label: 'includes', type: 'method', info: 'includes(searchElement: T, fromIndex?: number): boolean', boost: 88 },
              { label: 'indexOf', type: 'method', info: 'indexOf(searchElement: T, fromIndex?: number): number', boost: 83 },
              { label: 'join', type: 'method', info: 'join(separator?: string): string', boost: 82 },
              { label: 'slice', type: 'method', info: 'slice(start?: number, end?: number): T[]', boost: 81 },
              { label: 'concat', type: 'method', info: 'concat(...items: T[]): T[]', boost: 80 },
              { label: 'push', type: 'method', info: 'push(...items: T[]): number', boost: 79 },
              { label: 'pop', type: 'method', info: 'pop(): T | undefined', boost: 78 },
              { label: 'shift', type: 'method', info: 'shift(): T | undefined', boost: 77 },
              { label: 'unshift', type: 'method', info: 'unshift(...items: T[]): number', boost: 76 },
              { label: 'sort', type: 'method', info: 'sort(compareFn?: (a, b) => number): T[]', boost: 75 },
              { label: 'reverse', type: 'method', info: 'reverse(): T[]', boost: 74 },
              { label: 'flat', type: 'method', info: 'flat(depth?: number): any[]', boost: 70 },
              { label: 'flatMap', type: 'method', info: 'flatMap<U>(callback: (value, index, array) => U[]): U[]', boost: 69 },
              { label: 'at', type: 'method', info: 'at(index: number): T | undefined', boost: 68 },
              { label: 'length', type: 'property', info: 'number - Array length', boost: 100 },
            ];

            const commonObjectMethods = [
              { label: 'toString', type: 'method', info: 'toString(): string', boost: 50 },
              { label: 'valueOf', type: 'method', info: 'valueOf(): Object', boost: 49 },
              { label: 'hasOwnProperty', type: 'method', info: 'hasOwnProperty(v: string): boolean', boost: 48 },
            ];

            const commonStringMethods = [
              { label: 'length', type: 'property', info: 'number - String length', boost: 100 },
              { label: 'split', type: 'method', info: 'split(separator: string, limit?: number): string[]', boost: 95 },
              { label: 'trim', type: 'method', info: 'trim(): string', boost: 94 },
              { label: 'toLowerCase', type: 'method', info: 'toLowerCase(): string', boost: 93 },
              { label: 'toUpperCase', type: 'method', info: 'toUpperCase(): string', boost: 92 },
              { label: 'includes', type: 'method', info: 'includes(search: string): boolean', boost: 91 },
              { label: 'startsWith', type: 'method', info: 'startsWith(search: string): boolean', boost: 90 },
              { label: 'endsWith', type: 'method', info: 'endsWith(search: string): boolean', boost: 89 },
              { label: 'replace', type: 'method', info: 'replace(search: string | RegExp, replace: string): string', boost: 88 },
              { label: 'replaceAll', type: 'method', info: 'replaceAll(search: string, replace: string): string', boost: 87 },
              { label: 'substring', type: 'method', info: 'substring(start: number, end?: number): string', boost: 86 },
              { label: 'slice', type: 'method', info: 'slice(start?: number, end?: number): string', boost: 85 },
              { label: 'charAt', type: 'method', info: 'charAt(index: number): string', boost: 84 },
              { label: 'indexOf', type: 'method', info: 'indexOf(search: string): number', boost: 83 },
              { label: 'match', type: 'method', info: 'match(regexp: RegExp): RegExpMatchArray | null', boost: 82 },
              { label: 'padStart', type: 'method', info: 'padStart(length: number, fill?: string): string', boost: 70 },
              { label: 'padEnd', type: 'method', info: 'padEnd(length: number, fill?: string): string', boost: 69 },
            ];

            // Combine all methods - array methods first (most commonly needed)
            const allMethods = [...commonArrayMethods, ...commonStringMethods, ...commonObjectMethods];
            
            // Filter by what user has typed
            const filteredMethods = partialProperty 
              ? allMethods.filter(m => m.label.toLowerCase().startsWith(partialProperty.toLowerCase()))
              : allMethods;

            // Calculate position after the dot
            const dotPos = line.from + textBefore.lastIndexOf('.') + 1;

            return {
              from: dotPos,
              options: filteredMethods,
              validFor: /^[\w]*$/,
            };
          }

          // Allow normal autocomplete for non-property access
          return null;
        },
      ],
    });
  }, [availableVariables, buildTree, allTypes, definedTypes, packageTypes, installedPackages, credentials]);

  useEffect(() => {
    if (open) {
      setCode(initialCode);
      setLabel(initialLabel);
      
      // Calculate editor height - use most of the available viewport space
      const updateHeight = () => {
        // Use 85% of viewport height minus header/footer space (approx 200px)
        const availableHeight = window.innerHeight * 0.85 - 200;
        setEditorHeight(Math.max(600, availableHeight));
      };
      
      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }
  }, [open, initialCode, initialLabel]);

  const handleSave = useCallback(() => {
    onSave({ code, label });
    onOpenChange(false);
  }, [code, label, onSave, onOpenChange]);

  // Handle Ctrl+S / Cmd+S to save
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Always allow Ctrl+S in CodeMirror editor or node-label input
      const isInCodeEditor = target.closest(".cm-editor");
      const isInNodeLabel = target.id === "node-label";
      
      // Block if in other input fields
      if (
        target.tagName === "INPUT" &&
        !isInNodeLabel &&
        !isInCodeEditor
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        // Only save if label is valid
        if (!isDuplicateLabel && label.trim()) {
          handleSave();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, handleSave, isDuplicateLabel, label]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] w-[98vw] sm:!max-w-[98vw] h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Edit Code Node</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Node Label */}
          <div className="px-6 py-3 border-b bg-muted/20 flex-shrink-0">
            <Label htmlFor="node-label" className="text-sm font-medium mb-1.5 block">Node Label</Label>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Code Node"
              className={`h-9 ${isDuplicateLabel ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {isDuplicateLabel && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
                <span className="font-semibold">⚠️</span>
                This name is already used by another node. Please choose a unique name.
              </p>
            )}
          </div>
          
          {/* Main Editor Area */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* Variables Sidebar */}
            <div 
              className={`border-r bg-muted/30 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
                leftSidebarOpen ? 'w-72' : 'w-0'
              }`}
            >
              <div className="w-72 h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50">
                  <h3 className="text-sm font-semibold">Variables</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-accent border hover:border-border"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLeftSidebarOpen(false);
                    }}
                    title="Close sidebar"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {/* Base Variables (only if no input data) */}
                  {(!buildTree || Object.keys(buildTree).length === 0) && (
                    <div className="space-y-1">
                      {availableVariables.filter(v => {
                        const isBaseVar = v.name.startsWith("$") && !v.name.includes(".") && !v.name.includes("[");
                        return isBaseVar;
                      }).map((variable) => (
                        <div
                          key={variable.name}
                          className="px-3 py-2 text-xs font-mono hover:bg-accent/70 rounded-md cursor-move transition-colors border border-transparent hover:border-border"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", variable.name);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => {
                            const pos = cursorPosition !== null ? cursorPosition : code.length;
                            const newCode = code.slice(0, pos) + variable.name + code.slice(pos);
                            setCode(newCode);
                            setCursorPosition(pos + variable.name.length);
                          }}
                        >
                          {variable.name}
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
                                  node={{ ...node, key }}
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
                </div>
              </div>
            </div>

            {/* Toggle button when sidebar is closed */}
            {!leftSidebarOpen && (
              <div className="absolute left-0 top-0 bottom-0 z-10 flex items-start pt-4">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-12 w-10 rounded-r-md rounded-l-none shadow-lg hover:shadow-xl transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLeftSidebarOpen(true);
                  }}
                  title="Open sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </Button>
              </div>
            )}
            
            {/* Code Editor */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden" ref={editorContainerRef}>
              <div className="px-6 py-3 border-b bg-background/50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">TypeScript Code</Label>
                  <span className="text-xs text-muted-foreground">Autocomplete: Ctrl+Space or type after <code className="px-1">:</code></span>
                </div>
                <Popover open={typesPopoverOpen} onOpenChange={setTypesPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        Available Types ({definedTypes.length + packageTypes.length})
                      </span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${typesPopoverOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="end">
                    <div className="flex flex-col max-h-96">
                      {/* Header */}
                      <div className="px-4 py-3 border-b bg-muted/50">
                        <h4 className="font-semibold text-sm">Available Types</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Types available for autocomplete
                        </p>
                      </div>

                      {/* Content */}
                      <div className="overflow-y-auto">
                        {/* Custom Types */}
                        {definedTypes.length > 0 && (
                          <div className="p-3 border-b">
                            <div className="flex items-center gap-2 mb-2">
                              <FileType className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                Custom Types ({definedTypes.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {definedTypes.map((type) => (
                                <div key={type.name}>
                                  <div
                                    className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedType(expandedType === type.name ? null : type.name)}
                                  >
                                    <code className="text-xs font-mono font-semibold text-foreground">
                                      {type.name}
                                    </code>
                                    <span className="text-xs text-muted-foreground">
                                      ({type.kind})
                                    </span>
                                    {type.properties && type.properties.length > 0 && (
                                      <>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                          {type.properties.length} {type.properties.length === 1 ? 'property' : 'properties'}
                                        </span>
                                        <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${expandedType === type.name ? 'rotate-90' : ''}`} />
                                      </>
                                    )}
                                  </div>
                                  {/* Properties List */}
                                  {expandedType === type.name && type.properties && type.properties.length > 0 && (
                                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                                      {type.properties.map((prop) => (
                                        <div
                                          key={prop.name}
                                          className="flex items-start gap-2 px-2 py-1 rounded text-xs"
                                        >
                                          <code className="font-mono font-medium text-foreground">
                                            {prop.name}
                                          </code>
                                          <span className="text-muted-foreground">:</span>
                                          <code className="font-mono text-blue-600 dark:text-blue-400">
                                            {prop.type}
                                          </code>
                                          {!prop.required && (
                                            <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-auto">
                                              optional
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Package Types */}
                        {packageTypes.length > 0 && (
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <FileType className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                Package Types ({packageTypes.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {packageTypes.map((type) => (
                                <div
                                  key={type.name}
                                  className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors"
                                >
                                  <code className="text-xs font-mono font-semibold text-foreground">
                                    {type.name}
                                  </code>
                                  <span className="text-xs text-muted-foreground">
                                    ({type.kind})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No Types */}
                        {definedTypes.length === 0 && packageTypes.length === 0 && (
                          <div className="p-8 text-center">
                            <FileType className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No custom types defined</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Define types in your code to see them here
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div 
                className="flex-1 overflow-hidden relative mx-6 mb-4"
                style={{ minHeight: "600px" }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const variableName = e.dataTransfer.getData("text/plain");
                  if (variableName) {
                    // Insert at cursor position if available, otherwise at end
                    const pos = cursorPosition !== null ? cursorPosition : code.length;
                    const newCode = code.slice(0, pos) + variableName + code.slice(pos);
                    setCode(newCode);
                    setCursorPosition(pos + variableName.length);
                    // Clear the dataTransfer to prevent double insertion
                    e.dataTransfer.clearData();
                  }
                }}
              >
                <CodeMirror
                  value={code}
                  height={`${editorHeight}px`}
                  extensions={[
                    javascript({ typescript: true }),
                    typeScriptLinter,
                    customAutocomplete,
                    Prec.highest(keymap.of([
                      {
                        key: "Tab",
                        run: (view) => {
                          // Try to accept completion first
                          const accepted = acceptCompletion(view);
                          if (accepted) return true;
                          // If no completion was accepted, do normal indentation
                          return indentMore(view);
                        },
                      },
                    ])),
                    keymap.of(completionKeymap),
                  ]}
                  theme={vscodeDark}
                  onChange={(value) => setCode(value)}
                  onUpdate={(view) => {
                    if (view && !editorViewRef.current) {
                      editorViewRef.current = { view: view.view };
                    }
                    // Track cursor position
                    if (view?.view?.state?.selection?.main) {
                      setCursorPosition(view.view.state.selection.main.head);
                    }
                  }}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: false,
                    lintKeymap: true,
                  }}
                  onDrop={(e) => {
                    // Prevent CodeMirror's default drop behavior to avoid double insertion
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  editable={true}
                  placeholder="// Access previous node's output:\n// $json - first item's json from previous node\n// $input - array of all items from previous node\n\n// Example: Use data from previous node\nconst name = $json.name || 'Unknown';\nreturn [{ json: { greeting: `Hello ${name}` } }];\n\n// Or process all items:\nreturn $input.map(item => ({\n  json: { ...item.json, processed: true }\n}));"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-background flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isDuplicateLabel || !label.trim()}
              title={isDuplicateLabel ? "Node name must be unique" : !label.trim() ? "Node name cannot be empty" : "Save code (Ctrl+S)"}
            >
              Save
              <kbd className="ml-2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-secondary px-1.5 font-mono text-[10px] font-medium opacity-70">
                <span className="text-xs">Ctrl+S</span>
              </kbd>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

