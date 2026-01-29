"use client";

import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Braces, ChevronDown, ChevronRight, GripVertical, Code2, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputDataItem {
  sourceNodeId: string;
  output: unknown;
  sourceNodeLabel?: string;
}

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputData?: InputDataItem[];
  sourceNodeLabels?: Record<string, string>;
  className?: string;
  type?: "string" | "number" | "json";
}

// Available expression variables
const BASE_VARIABLES = [
  { name: "$json", description: "First item's json from previous node", example: "$json.fieldName" },
  { name: "$input", description: "Array of all items from previous node", example: "$input.map(item => item.json)" },
  { name: "$input.first()", description: "First item from input", example: "$input.first().json" },
  { name: "$input.last()", description: "Last item from input", example: "$input.last().json" },
  { name: "$input.length", description: "Number of items", example: "$input.length" },
];

export function ExpressionInput({
  value,
  onChange,
  placeholder = "Enter value",
  inputData = [],
  sourceNodeLabels = {},
  className,
  type = "string",
}: ExpressionInputProps) {
  const [isExpressionMode, setIsExpressionMode] = useState(value?.startsWith("={{") || false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract display value (without expression wrapper)
  const displayValue = useMemo(() => {
    if (isExpressionMode && value?.startsWith("={{") && value?.endsWith("}}")) {
      return value.slice(3, -2);
    }
    return value || "";
  }, [value, isExpressionMode]);

  // Build tree from input data
  const dataTree = useMemo(() => {
    if (!inputData || inputData.length === 0) return null;
    
    const trees: Record<string, any> = {};
    
    inputData.forEach((input) => {
      const sourceLabel = input.sourceNodeLabel || sourceNodeLabels[input.sourceNodeId] || `Node ${input.sourceNodeId.slice(0, 8)}`;
      const output = input.output;
      
      if (Array.isArray(output) && output.length > 0 && output[0]?.json !== undefined) {
        const items = output as Array<{ json: unknown }>;
        trees[sourceLabel] = {
          $json: items[0]?.json,
          $input: items.map(i => i.json),
          $input_length: items.length,
        };
      } else if (typeof output === 'object' && output !== null) {
        trees[sourceLabel] = { $json: output };
      }
    });
    
    return trees;
  }, [inputData, sourceNodeLabels]);

  // Get autocomplete suggestions based on current input
  const suggestions = useMemo(() => {
    const current = displayValue.toLowerCase();
    const allSuggestions: Array<{ name: string; description: string; insertText: string }> = [];
    
    // Add base variables
    BASE_VARIABLES.forEach(v => {
      if (v.name.toLowerCase().includes(current) || current === "") {
        allSuggestions.push({
          name: v.name,
          description: v.description,
          insertText: v.name,
        });
      }
    });
    
    // Add fields from input data
    if (dataTree) {
      Object.entries(dataTree).forEach(([, tree]) => {
        if (tree.$json && typeof tree.$json === 'object') {
          Object.keys(tree.$json as object).forEach(key => {
            const path = `$json.${key}`;
            if (path.toLowerCase().includes(current) || current === "") {
              allSuggestions.push({
                name: path,
                description: `Field from previous node`,
                insertText: path,
              });
            }
          });
        }
      });
    }
    
    return allSuggestions.slice(0, 15);
  }, [displayValue, dataTree]);

  // Handle value changes
  const handleChange = (newValue: string) => {
    if (isExpressionMode) {
      onChange(`={{${newValue}}}`);
    } else {
      onChange(newValue);
    }
  };

  // Toggle expression mode
  const toggleExpressionMode = () => {
    if (isExpressionMode) {
      // Switch to static mode - use the expression as the value
      onChange(displayValue);
      setIsExpressionMode(false);
    } else {
      // Switch to expression mode - wrap in expression syntax
      onChange(`={{${value || ""}}}`);
      setIsExpressionMode(true);
    }
  };

  // Insert suggestion
  const insertSuggestion = (text: string) => {
    handleChange(text);
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  // Tree node for data panel
  const TreeNode = ({ label, data, path, level = 0 }: { label: string; data: any; path: string; level?: number }) => {
    const [expanded, setExpanded] = useState(level < 2);
    const isObject = data !== null && typeof data === 'object';
    const isArray = Array.isArray(data);
    
    const handleInsert = () => {
      handleChange(path);
      setShowDataPanel(false);
    };
    
    return (
      <div className="select-none">
        <div 
          className={cn(
            "flex items-center gap-1.5 py-1 px-2 hover:bg-accent/70 rounded cursor-pointer text-xs",
            "group transition-colors"
          )}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={(e) => {
            if (isObject) {
              e.stopPropagation();
              setExpanded(!expanded);
            } else {
              handleInsert();
            }
          }}
        >
          {isObject ? (
            expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> 
                     : <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <div className="w-3" />
          )}
          <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
          <code className="font-mono text-xs">{label}</code>
          {!isObject && (
            <span className="text-muted-foreground/70 ml-2 truncate max-w-[150px]">
              {JSON.stringify(data)?.slice(0, 30)}
            </span>
          )}
          {isArray && (
            <span className="text-muted-foreground/60 ml-1">[{data.length}]</span>
          )}
        </div>
        {expanded && isObject && !isArray && (
          <div>
            {Object.entries(data).map(([key, val]) => (
              <TreeNode 
                key={key} 
                label={key} 
                data={val} 
                path={`${path}.${key}`}
                level={level + 1}
              />
            ))}
          </div>
        )}
        {expanded && isArray && data.length > 0 && (
          <div>
            {data.slice(0, 3).map((item: any, idx: number) => (
              <TreeNode 
                key={idx} 
                label={`[${idx}]`} 
                data={item} 
                path={`${path}[${idx}]`}
                level={level + 1}
              />
            ))}
            {data.length > 3 && (
              <div 
                className="text-xs text-muted-foreground/60 py-1"
                style={{ paddingLeft: `${(level + 1) * 12 + 4}px` }}
              >
                ...and {data.length - 3} more items
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-1">
        {/* Expression mode toggle */}
        <Button
          type="button"
          variant={isExpressionMode ? "default" : "outline"}
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          onClick={toggleExpressionMode}
          title={isExpressionMode ? "Switch to static value" : "Switch to expression"}
        >
          {isExpressionMode ? (
            <Code2 className="h-4 w-4" />
          ) : (
            <Type className="h-4 w-4" />
          )}
        </Button>

        {/* Main input */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => isExpressionMode && setShowAutocomplete(true)}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
            placeholder={isExpressionMode ? "Enter expression (e.g. $json.field)" : placeholder}
            className={cn(
              "font-mono text-sm",
              isExpressionMode && "bg-purple-500/10 border-purple-500/50"
            )}
          />
          
          {/* Autocomplete dropdown */}
          {showAutocomplete && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-auto">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                  onMouseDown={() => insertSuggestion(s.insertText)}
                >
                  <code className="font-mono text-xs">{s.name}</code>
                  <span className="text-muted-foreground ml-2 text-xs">{s.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data browser button */}
        {dataTree && Object.keys(dataTree).length > 0 && (
          <Popover open={showDataPanel} onOpenChange={setShowDataPanel}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                title="Browse available data"
              >
                <Braces className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-2 border-b">
                <span className="text-sm font-medium">Available Data</span>
                <p className="text-xs text-muted-foreground">Click a field to insert it</p>
              </div>
              <div className="max-h-[300px] overflow-auto p-2">
                {Object.entries(dataTree).map(([sourceLabel, tree]) => (
                  <div key={sourceLabel} className="mb-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
                      From: {sourceLabel}
                    </div>
                    {tree.$json && (
                      <TreeNode label="$json" data={tree.$json} path="$json" />
                    )}
                    {tree.$input && (
                      <TreeNode label="$input" data={tree.$input} path="$input" />
                    )}
                    {tree.$input_length !== undefined && (
                      <div 
                        className="flex items-center gap-1.5 py-1 px-2 hover:bg-accent/70 rounded cursor-pointer text-xs"
                        onClick={() => {
                          handleChange("$input.length");
                          setShowDataPanel(false);
                        }}
                      >
                        <div className="w-3" />
                        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                        <code className="font-mono">$input.length</code>
                        <span className="text-muted-foreground/70 ml-2">{tree.$input_length}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {/* Expression mode indicator */}
      {isExpressionMode && (
        <div className="text-xs text-purple-400 mt-1">
          Expression: <code className="bg-purple-500/20 px-1 rounded">{"={{" + displayValue + "}}"}</code>
        </div>
      )}
    </div>
  );
}
