"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, Plus } from "lucide-react";

interface CredentialDialogProps {
  organizationId: string;
  workflowId?: string; // Optional workflow scope
  credentialId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CredentialDialog({
  organizationId,
  workflowId,
  credentialId,
  open,
  onOpenChange,
}: CredentialDialogProps) {
  const [internalId, setInternalId] = useState<string | null>(credentialId || null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"postgres" | "mysql" | "mongodb" | "redis">("postgres");
  
  // Postgres/MySQL fields
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [database, setDatabase] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [ssl, setSsl] = useState(false);
  const [sqlConnectionString, setSqlConnectionString] = useState("");
  
  // MongoDB fields
  const [connectionString, setConnectionString] = useState("");
  const [mongoDatabase, setMongoDatabase] = useState("");
  
  // Redis fields
  const [redisHost, setRedisHost] = useState("");
  const [redisPort, setRedisPort] = useState("");
  const [redisPassword, setRedisPassword] = useState("");
  const [redisDatabase, setRedisDatabase] = useState("");

  useEffect(() => {
    setInternalId(credentialId || null);
  }, [credentialId]);

  const utils = trpc.useUtils();

  const { data: credentials } = trpc.credentials.list.useQuery(
    { organizationId, workflowId },
    { enabled: open }
  );

  const { data: existingCredential, isLoading: isLoadingCredential } =
    trpc.credentials.get.useQuery(
      { organizationId, credentialId: internalId! },
      { enabled: !!internalId }
    );

  const createMutation = trpc.credentials.create.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate({ organizationId });
      resetForm();
    },
  });

  const updateMutation = trpc.credentials.update.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate({ organizationId });
      utils.credentials.get.invalidate({ credentialId: internalId! });
      resetForm();
    },
  });

  const deleteMutation = trpc.credentials.delete.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate({ organizationId });
      if (internalId) resetForm();
    },
  });

  useEffect(() => {
    if (existingCredential) {
      setName(existingCredential.name);
      setDescription(existingCredential.description || "");
      setType(existingCredential.type as any);
      
      const config = existingCredential.config as any;
      if (!config) return;
      
      if (existingCredential.type === "postgres" || existingCredential.type === "mysql") {
        setHost(config.host || "");
        setPort(config.port?.toString() || "");
        setDatabase(config.database || "");
        setUser(config.user || "");
        setPassword(config.password || "");
        setSsl(config.ssl || false);
      } else if (existingCredential.type === "mongodb") {
        setConnectionString(config.connectionString || "");
        setMongoDatabase(config.database || "");
      } else if (existingCredential.type === "redis") {
        setRedisHost(config.host || "");
        setRedisPort(config.port?.toString() || "");
        setRedisPassword(config.password || "");
        setRedisDatabase(config.database?.toString() || "");
      }
    }
  }, [existingCredential]);

  const resetForm = () => {
    setInternalId(null);
    setName("");
    setDescription("");
    setType("postgres");
    setHost("");
    setPort("");
    setDatabase("");
    setUser("");
    setPassword("");
    setSsl(false);
    setSqlConnectionString("");
    setConnectionString("");
    setMongoDatabase("");
    setRedisHost("");
    setRedisPort("");
    setRedisPassword("");
    setRedisDatabase("");
  };

  const handleSave = async () => {
    let config: any;
    
    if (type === "postgres") {
      config = {
        host,
        port: parseInt(port) || 5432,
        database,
        user,
        password,
        ssl,
      };
    } else if (type === "mysql") {
      config = {
        host,
        port: parseInt(port) || 3306,
        database,
        user,
        password,
        ssl,
      };
    } else if (type === "mongodb") {
      config = {
        connectionString,
        database: mongoDatabase,
      };
    } else if (type === "redis") {
      config = {
        host: redisHost,
        port: parseInt(redisPort) || 6379,
        password: redisPassword || undefined,
        database: redisDatabase ? parseInt(redisDatabase) : undefined,
      };
    }

    if (internalId) {
      await updateMutation.mutateAsync({
        organizationId,
        credentialId: internalId,
        name,
        description,
        config,
      });
    } else {
      await createMutation.mutateAsync({
        organizationId,
        workflowId: workflowId, // Pass workflowId if provided
        name,
        type,
        description,
        config,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>{internalId ? "Edit Credential" : "Create Credential"}</span>
            {internalId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Database"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Production database"
              />
            </div>

            {!internalId && (
              <div>
                <Label>Type</Label>
                <Tabs value={type} onValueChange={(v) => setType(v as any)}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="postgres">PostgreSQL</TabsTrigger>
                    <TabsTrigger value="mysql">MySQL</TabsTrigger>
                    <TabsTrigger value="mongodb">MongoDB</TabsTrigger>
                    <TabsTrigger value="redis">Redis</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {(type === "postgres" || type === "mysql") && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold">Connection Details</h3>
                
                {/* Connection String Parser */}
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <Label htmlFor="connString" className="text-sm font-medium">
                    Paste Connection String (optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="connString"
                      value={sqlConnectionString}
                      onChange={(e) => setSqlConnectionString(e.target.value)}
                      placeholder={type === "postgres" 
                        ? "postgresql://user:password@host:5432/database?sslmode=require"
                        : "mysql://user:password@host:3306/database"
                      }
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const url = sqlConnectionString.trim();
                        if (!url) return;
                        
                        try {
                          // Remove psql command prefix if present
                          let cleanUrl = url;
                          if (url.startsWith("psql ")) {
                            cleanUrl = url.replace("psql ", "").replace(/^['"]|['"]$/g, "");
                          }
                          
                          // Parse the URL using URL API for more robust parsing
                          const parsed = new URL(cleanUrl);
                          
                          const parsedUser = decodeURIComponent(parsed.username);
                          const parsedPassword = decodeURIComponent(parsed.password);
                          const parsedHost = parsed.hostname;
                          const parsedPort = parsed.port || (type === "postgres" ? "5432" : "3306");
                          const parsedDatabase = parsed.pathname.replace(/^\//, "");
                          
                          if (parsedUser) setUser(parsedUser);
                          if (parsedPassword) setPassword(parsedPassword);
                          if (parsedHost) setHost(parsedHost);
                          if (parsedPort) setPort(parsedPort);
                          if (parsedDatabase) setDatabase(parsedDatabase);
                          
                          // Check for SSL in query string
                          const sslMode = parsed.searchParams.get("sslmode");
                          if (sslMode === "require" || sslMode === "verify-full" || sslMode === "verify-ca") {
                            setSsl(true);
                          }
                          
                          // Auto-set name if empty
                          if (!name && parsedHost) {
                            setName(`${type === "postgres" ? "PostgreSQL" : "MySQL"} - ${parsedHost}`);
                          }
                        } catch (err) {
                          console.error("Failed to parse connection string:", err);
                          alert("Could not parse connection string. Please check the format and try again.");
                        }
                      }}
                    >
                      Parse
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste a connection URL and click Parse to auto-fill the fields below
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="host">Host</Label>
                    <Input
                      id="host"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder={type === "postgres" ? "5432" : "3306"}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="database">Database</Label>
                  <Input
                    id="database"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="mydb"
                  />
                </div>
                <div>
                  <Label htmlFor="user">User</Label>
                  <Input
                    id="user"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="username"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ssl"
                    checked={ssl}
                    onChange={(e) => setSsl(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="ssl">Enable SSL</Label>
                </div>
              </div>
            )}

            {type === "mongodb" && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold">MongoDB Connection</h3>
                <div>
                  <Label htmlFor="connectionString">Connection String</Label>
                  <Input
                    id="connectionString"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder="mongodb://localhost:27017"
                  />
                </div>
                <div>
                  <Label htmlFor="mongoDatabase">Database</Label>
                  <Input
                    id="mongoDatabase"
                    value={mongoDatabase}
                    onChange={(e) => setMongoDatabase(e.target.value)}
                    placeholder="mydb"
                  />
                </div>
              </div>
            )}

            {type === "redis" && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold">Redis Connection</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="redisHost">Host</Label>
                    <Input
                      id="redisHost"
                      value={redisHost}
                      onChange={(e) => setRedisHost(e.target.value)}
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <Label htmlFor="redisPort">Port</Label>
                    <Input
                      id="redisPort"
                      value={redisPort}
                      onChange={(e) => setRedisPort(e.target.value)}
                      placeholder="6379"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="redisPassword">Password (Optional)</Label>
                  <Input
                    id="redisPassword"
                    type="password"
                    value={redisPassword}
                    onChange={(e) => setRedisPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="redisDatabase">Database Number (Optional)</Label>
                  <Input
                    id="redisDatabase"
                    value={redisDatabase}
                    onChange={(e) => setRedisDatabase(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !name ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {internalId ? "Update" : "Create"}
            </Button>
          </div>

          {/* Existing Credentials List */}
          {credentials && credentials.length > 0 && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-sm font-semibold mb-3">Existing Credentials</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {credentials.map((cred) => (
                  <div 
                    key={cred.id} 
                    className={`flex items-center justify-between p-3 rounded-md border text-sm ${
                      internalId === cred.id ? "bg-accent border-primary" : "bg-card hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{cred.name}</span>
                      <span className="text-xs text-muted-foreground">{cred.type}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setInternalId(cred.id)}
                      >
                        <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this credential?")) {
                            deleteMutation.mutate({ organizationId, credentialId: cred.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
