"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Plus, Key } from "lucide-react";

type DatabaseType = "postgres" | "mysql" | "mongodb" | "redis";

interface DatabaseNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  databaseType: DatabaseType;
  nodeId: string;
  initialConfig?: {
    operation?: string;
    query?: string;
    collection?: string;
    table?: string;
    key?: string;
    value?: string;
    field?: string;
    credentialId?: string;
    credentialName?: string;
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: Record<string, unknown> }) => void;
  // Input data from previous nodes for expression suggestions
  inputData?: Record<string, unknown>;
  sourceNodeLabels?: string[];
}

// Operation definitions per database type
const OPERATIONS: Record<DatabaseType, { label: string; value: string }[]> = {
  postgres: [
    { label: "Execute Query", value: "query" },
    { label: "Insert", value: "insert" },
    { label: "Update", value: "update" },
    { label: "Delete", value: "delete" },
  ],
  mysql: [
    { label: "Execute Query", value: "query" },
    { label: "Insert", value: "insert" },
    { label: "Update", value: "update" },
    { label: "Delete", value: "delete" },
  ],
  mongodb: [
    { label: "Find", value: "find" },
    { label: "Find One", value: "findOne" },
    { label: "Insert One", value: "insertOne" },
    { label: "Insert Many", value: "insertMany" },
    { label: "Update One", value: "updateOne" },
    { label: "Update Many", value: "updateMany" },
    { label: "Delete One", value: "deleteOne" },
    { label: "Delete Many", value: "deleteMany" },
    { label: "Aggregate", value: "aggregate" },
  ],
  redis: [
    { label: "Get", value: "get" },
    { label: "Set", value: "set" },
    { label: "Delete", value: "del" },
    { label: "Hash Get", value: "hget" },
    { label: "Hash Set", value: "hset" },
    { label: "List Push Left", value: "lpush" },
    { label: "List Push Right", value: "rpush" },
    { label: "List Pop Left", value: "lpop" },
    { label: "List Pop Right", value: "rpop" },
    { label: "List Range", value: "lrange" },
    { label: "Keys", value: "keys" },
    { label: "Expire", value: "expire" },
  ],
};

const DATABASE_LABELS: Record<DatabaseType, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  redis: "Redis",
};

export function DatabaseNodeDialog({
  open,
  onOpenChange,
  organizationId,
  databaseType,
  nodeId,
  initialConfig,
  initialLabel,
  onSave,
  inputData,
  sourceNodeLabels,
}: DatabaseNodeDialogProps) {
  const [label, setLabel] = useState(initialLabel || DATABASE_LABELS[databaseType]);
  const [operation, setOperation] = useState(initialConfig?.operation || OPERATIONS[databaseType][0]?.value || "query");
  const [credentialId, setCredentialId] = useState(initialConfig?.credentialId || "");
  
  // SQL/Query fields
  const [query, setQuery] = useState(initialConfig?.query || "");
  const [table, setTable] = useState(initialConfig?.table || "");
  const [collection, setCollection] = useState(initialConfig?.collection || "");
  
  // Redis fields
  const [key, setKey] = useState(initialConfig?.key || "");
  const [value, setValue] = useState(initialConfig?.value || "");
  const [field, setField] = useState(initialConfig?.field || "");

  // Fetch credentials
  const { data: credentials } = trpc.credentials.list.useQuery(
    { organizationId },
    { enabled: open }
  );

  // Filter credentials by database type
  const filteredCredentials = credentials?.filter(c => c.type === databaseType) || [];

  useEffect(() => {
    if (initialConfig) {
      setOperation(initialConfig.operation || OPERATIONS[databaseType][0]?.value || "query");
      setCredentialId(initialConfig.credentialId || "");
      setQuery(initialConfig.query || "");
      setTable(initialConfig.table || "");
      setCollection(initialConfig.collection || "");
      setKey(initialConfig.key || "");
      setValue(initialConfig.value || "");
      setField(initialConfig.field || "");
    }
    if (initialLabel) {
      setLabel(initialLabel);
    }
  }, [initialConfig, initialLabel, databaseType]);

  const handleSave = () => {
    const selectedCred = filteredCredentials.find(c => c.id === credentialId);
    
    const config: Record<string, unknown> = {
      operation,
      credentialId,
      credentialName: selectedCred?.name,
    };

    // Add type-specific fields
    if (databaseType === "postgres" || databaseType === "mysql") {
      config.query = query;
      config.table = table;
    } else if (databaseType === "mongodb") {
      config.collection = collection;
      config.query = query;
    } else if (databaseType === "redis") {
      config.key = key;
      config.value = value;
      config.field = field;
    }

    onSave({ label, config });
    onOpenChange(false);
  };

  // Generate expression suggestions from input data
  const getExpressionSuggestions = (): string[] => {
    const suggestions: string[] = [];
    
    if (inputData) {
      const addSuggestions = (obj: Record<string, unknown>, prefix = "") => {
        for (const [k, v] of Object.entries(obj)) {
          const path = prefix ? `${prefix}.${k}` : k;
          suggestions.push(`{{ $json.${path} }}`);
          if (v && typeof v === "object" && !Array.isArray(v)) {
            addSuggestions(v as Record<string, unknown>, path);
          }
        }
      };
      addSuggestions(inputData);
    }

    return suggestions;
  };

  const expressionSuggestions = getExpressionSuggestions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configure {DATABASE_LABELS[databaseType]}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Node Label */}
          <div className="space-y-2">
            <Label>Node Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter node label..."
            />
          </div>

          {/* Credential Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Credential
            </Label>
            {filteredCredentials.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">
                  No {DATABASE_LABELS[databaseType]} credentials found.
                </span>
                <Button variant="outline" size="sm" className="ml-auto">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Credential
                </Button>
              </div>
            ) : (
              <Select value={credentialId} onValueChange={setCredentialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select credential..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCredentials.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      {cred.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Operation */}
          <div className="space-y-2">
            <Label>Operation</Label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATIONS[databaseType].map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          {(databaseType === "postgres" || databaseType === "mysql") && (
            <>
              <div className="space-y-2">
                <Label>Table (optional)</Label>
                <Input
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  placeholder="users"
                />
              </div>
              <div className="space-y-2">
                <Label>Query</Label>
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SELECT * FROM users WHERE id = {{ $json.userId }}"
                  className="font-mono text-sm min-h-[120px]"
                />
                {expressionSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">Suggestions:</span>
                    {expressionSuggestions.slice(0, 5).map((expr, i) => (
                      <button
                        key={i}
                        type="button"
                        className="text-xs px-2 py-0.5 bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                        onClick={() => setQuery(prev => prev + " " + expr)}
                      >
                        {expr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {databaseType === "mongodb" && (
            <>
              <div className="space-y-2">
                <Label>Collection</Label>
                <Input
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  placeholder="users"
                />
              </div>
              <div className="space-y-2">
                <Label>Query / Document (JSON)</Label>
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='{ "email": "{{ $json.email }}" }'
                  className="font-mono text-sm min-h-[120px]"
                />
                {expressionSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">Suggestions:</span>
                    {expressionSuggestions.slice(0, 5).map((expr, i) => (
                      <button
                        key={i}
                        type="button"
                        className="text-xs px-2 py-0.5 bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                        onClick={() => setQuery(prev => prev + " " + expr)}
                      >
                        {expr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {databaseType === "redis" && (
            <>
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="user:{{ $json.userId }}"
                />
              </div>
              {(operation === "set" || operation === "lpush" || operation === "rpush" || operation === "hset") && (
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="{{ $json.data }}"
                  />
                </div>
              )}
              {(operation === "hget" || operation === "hset") && (
                <div className="space-y-2">
                  <Label>Field</Label>
                  <Input
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    placeholder="email"
                  />
                </div>
              )}
              {expressionSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground">Suggestions:</span>
                  {expressionSuggestions.slice(0, 5).map((expr, i) => (
                    <button
                      key={i}
                      type="button"
                      className="text-xs px-2 py-0.5 bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                      onClick={() => setKey(prev => prev + expr)}
                    >
                      {expr}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!credentialId && filteredCredentials.length > 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
