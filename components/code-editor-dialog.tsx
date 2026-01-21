"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion, completionKeymap, acceptCompletion } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { GripVertical, ChevronRight, ChevronDown, ChevronLeft, PanelLeftClose, PanelLeftOpen, FileType } from "lucide-react";

interface CodeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
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
  existingNodeLabels?: string[]; // List of existing node labels for uniqueness check
  onSave: (data: { code: string; label: string }) => void;
}

export function CodeEditorDialog({
  open,
  onOpenChange,
  nodeId,
  initialCode = "",
  initialLabel = "Code Node",
  inputData,
  sourceNodeLabels,
  typeDefinitions,
  existingNodeLabels = [],
  onSave,
}: CodeEditorDialogProps) {
  const [code, setCode] = useState(initialCode);
  const [label, setLabel] = useState(initialLabel);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<{ view: any } | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [editorHeight, setEditorHeight] = useState(700);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  
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
    const baseVars = [
      { name: "$json", description: "First item's json from previous node", example: "$json.fieldName", value: undefined, type: "object" },
      { name: "$input", description: "Array of all items from previous node", example: "$input.map(...)", value: undefined, type: "array" },
      { name: "$inputItem", description: "Alias for $json", example: "$inputItem.fieldName", value: undefined, type: "object" },
      { name: "$inputAll", description: "Alias for $input", example: "$inputAll.length", value: undefined, type: "array" },
    ];
    
    // Add actual field paths from input data with their values
    const fieldVars = inputFields.map(field => ({
      name: field.path,
      description: `Value: ${formatValue(field.value)}`,
      example: field.path,
      value: field.value,
      type: field.type,
      sourceNodeId: field.sourceNodeId,
    }));
    
    return [...baseVars, ...fieldVars];
  }, [inputFields]);

  // Standard TypeScript types
  const standardTypes = useMemo(() => [
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

  // Parse type definitions to extract type names
  const definedTypes = useMemo(() => {
    const types: Array<{ name: string; kind: string; info: string }> = [];
    
    if (!typeDefinitions) return types;
    
    // Extract interface names: interface Name { ... }
    const interfaceRegex = /interface\s+([A-Z]\w*)/g;
    let match;
    while ((match = interfaceRegex.exec(typeDefinitions)) !== null) {
      types.push({
        name: match[1],
        kind: 'interface',
        info: `Interface ${match[1]} (from global types)`,
      });
    }
    
    // Extract type names: type Name = ...
    const typeRegex = /type\s+([A-Z]\w*)\s*=/g;
    while ((match = typeRegex.exec(typeDefinitions)) !== null) {
      types.push({
        name: match[1],
        kind: 'type',
        info: `Type ${match[1]} (from global types)`,
      });
    }
    
    // Extract enum names: enum Name { ... }
    const enumRegex = /enum\s+([A-Z]\w*)/g;
    while ((match = enumRegex.exec(typeDefinitions)) !== null) {
      types.push({
        name: match[1],
        kind: 'enum',
        info: `Enum ${match[1]} (from global types)`,
      });
    }
    
    // Extract class names: class Name { ... }
    const classRegex = /class\s+([A-Z]\w*)/g;
    while ((match = classRegex.exec(typeDefinitions)) !== null) {
      types.push({
        name: match[1],
        kind: 'class',
        info: `Class ${match[1]} (from global types)`,
      });
    }
    
    console.log('Parsed types from definitions:', types);
    
    return types;
  }, [typeDefinitions]);
  
  // Combine standard types with custom types (custom types get priority)
  const allTypes = useMemo(() => {
    return [...definedTypes, ...standardTypes];
  }, [definedTypes, standardTypes]);

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
        // Autocomplete for custom types - always show all types
        (context) => {
          if (allTypes.length === 0) return null;
          
          const line = context.state.doc.lineAt(context.pos);
          const lineStart = line.from;
          const textBefore = line.text.slice(0, context.pos - lineStart);
          
          // Try to match any word starting with uppercase
          const word = context.matchBefore(/[A-Z][\w]*/);
          
          // If we have a word, check if it's in a type position
          if (word && word.text.length > 0) {
            const textBeforeWord = textBefore.slice(0, word.from - lineStart);
            const isTypePosition = 
              /:\s*$/.test(textBeforeWord) ||
              /<\s*$/.test(textBeforeWord) ||
              /\bas\s+$/.test(textBeforeWord) ||
              /\bextends\s+$/.test(textBeforeWord) ||
              /\bimplements\s+$/.test(textBeforeWord);
            
            if (isTypePosition) {
              const typedText = word.text.toLowerCase();
              return {
                from: word.from,
                options: allTypes
                  .filter(t => t.name.toLowerCase().startsWith(typedText))
                  .map(t => ({
                    label: t.name,
                    type: t.kind,
                    info: t.info,
                    // Custom types get higher priority
                    boost: definedTypes.some(dt => dt.name === t.name) ? 99 : 50,
                  })),
                validFor: /^[\w]*$/,
              };
            }
          }
          
          // If explicit (Ctrl+Space), show types after : or <
          if (context.explicit) {
            const colonMatch = textBefore.match(/:\s*$/);
            const angleMatch = textBefore.match(/<\s*$/);
            
            if (colonMatch || angleMatch) {
              return {
                from: context.pos,
                options: allTypes.map(t => ({
                  label: t.name,
                  type: t.kind,
                  info: t.info,
                  // Custom types get higher priority
                  boost: definedTypes.some(dt => dt.name === t.name) ? 99 : 50,
                })),
              };
            }
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
      ],
    });
  }, [availableVariables, buildTree, definedTypes]);

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
                  <span className="text-xs text-muted-foreground">Use Ctrl+Space for autocomplete</span>
                </div>
                {typeDefinitions && definedTypes.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <FileType className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {definedTypes.length} type{definedTypes.length !== 1 ? 's' : ''}: {definedTypes.map(t => t.name).join(', ')}
                    </span>
                  </div>
                )}
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
                    customAutocomplete,
                    keymap.of([
                      ...completionKeymap,
                      { key: "Tab", run: acceptCompletion },
                    ]),
                  ]}
                  theme={oneDark}
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
                    autocompletion: true,
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
        <DialogFooter className="px-6 py-4 border-t bg-muted/10 flex-shrink-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="gap-2"
            disabled={isDuplicateLabel || !label.trim()}
            title={isDuplicateLabel ? "Node name must be unique" : !label.trim() ? "Node name cannot be empty" : "Save code (Ctrl+S)"}
          >
            <span>Save</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">Ctrl+S</span>
            </kbd>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

