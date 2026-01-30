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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  // MongoDB fields
  const [connectionString, setConnectionString] = useState("");
  const [mongoDatabase, setMongoDatabase] = useState("");
  
  // Redis fields
  const [redisHost, setRedisHost] = useState("");
  const [redisPort, setRedisPort] = useState("");
  const [redisPassword, setRedisPassword] = useState("");
  const [redisDatabase, setRedisDatabase] = useState("");

  const utils = trpc.useUtils();

  const { data: existingCredential, isLoading: isLoadingCredential } =
    trpc.credentials.get.useQuery(
      { organizationId, credentialId: credentialId! },
      { enabled: !!credentialId }
    );

  const createMutation = trpc.credentials.create.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate({ organizationId });
      onOpenChange(false);
      resetForm();
    },
  });

  const updateMutation = trpc.credentials.update.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate({ organizationId });
      onOpenChange(false);
      resetForm();
    },
  });

  useEffect(() => {
    if (existingCredential) {
      setName(existingCredential.name);
      setDescription(existingCredential.description || "");
      setType(existingCredential.type as any);
      
      const config = existingCredential.config as any;
      
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
    setName("");
    setDescription("");
    setType("postgres");
    setHost("");
    setPort("");
    setDatabase("");
    setUser("");
    setPassword("");
    setSsl(false);
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

    if (credentialId) {
      await updateMutation.mutateAsync({
        organizationId,
        credentialId,
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
          <DialogTitle>
            {credentialId ? "Edit Credential" : "Create Credential"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {!credentialId && (
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
            {credentialId ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
