"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Webhook, Copy, ExternalLink, Radio, Send, AlertCircle, CheckCircle2, Shield, Eye, EyeOff, Key, Gauge } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

interface WebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  workflowId: string;
  organizationId: string;
  initialConfig?: {
    path?: string;
    method?: string;
    responseMode?: "waitForResult" | "respondImmediately";
    webhookId?: string;
    authType?: "none" | "api_key" | "bearer" | "basic";
    authConfig?: Record<string, unknown>;
    rateLimit?: number;
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { path: string; method: string; responseMode?: "waitForResult" | "respondImmediately"; webhookId?: string; authType?: string; authConfig?: Record<string, unknown>; rateLimit?: number } }) => void;
  onTestFlow?: (testData: Record<string, unknown>) => void;
}

export function WebhookDialog({
  open,
  onOpenChange,
  nodeId,
  workflowId,
  organizationId,
  initialConfig,
  initialLabel = "Webhook",
  onSave,
  onTestFlow,
}: WebhookDialogProps) {
  const [label, setLabel] = useState(initialLabel);
  const [path, setPath] = useState(initialConfig?.path || "");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE" | "PATCH">(
    (initialConfig?.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH") || "POST"
  );
  const [responseMode, setResponseMode] = useState<"waitForResult" | "respondImmediately">(
    initialConfig?.responseMode || "waitForResult"
  );
  const [copied, setCopied] = useState(false);
  const [webhookId, setWebhookId] = useState<string | undefined>(initialConfig?.webhookId);
  const [isListening, setIsListening] = useState(false);
  const [receivedRequest, setReceivedRequest] = useState<any>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Authentication state
  const [authType, setAuthType] = useState<"none" | "api_key" | "bearer" | "basic">(
    initialConfig?.authType || "none"
  );
  const [apiKey, setApiKey] = useState((initialConfig?.authConfig?.apiKey as string) || "");
  const [apiKeyHeader, setApiKeyHeader] = useState((initialConfig?.authConfig?.headerName as string) || "x-api-key");
  const [bearerToken, setBearerToken] = useState((initialConfig?.authConfig?.token as string) || "");
  const [basicUsername, setBasicUsername] = useState((initialConfig?.authConfig?.username as string) || "");
  const [basicPassword, setBasicPassword] = useState((initialConfig?.authConfig?.password as string) || "");
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Rate limiting state
  const [rateLimit, setRateLimit] = useState(initialConfig?.rateLimit ?? 100);

  const createMutation = trpc.webhooks.create.useMutation();
  const updateMutation = trpc.webhooks.update.useMutation();
  const utils = trpc.useUtils();

  // Generate a random path only if not provided in initialConfig
  useEffect(() => {
    // Only generate if we don't have an initial path AND the dialog is opening
    if (!initialConfig?.path && !path && open) {
      const randomPath = Math.random().toString(36).substring(2, 15);
      setPath(randomPath);
    }
  }, [open]); // Remove 'path' from dependencies to prevent regeneration

  // Query to find existing webhook by path (in case webhookId is missing from config)
  const existingWebhookQuery = trpc.webhooks.list.useQuery(
    { organizationId },
    { enabled: open && !!initialConfig?.path && !initialConfig?.webhookId }
  );

  // Reset state when dialog opens with existing config
  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setPath(initialConfig?.path || "");
      setMethod((initialConfig?.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH") || "POST");
      setResponseMode(initialConfig?.responseMode || "waitForResult");
      setAuthType(initialConfig?.authType || "none");
      setApiKey((initialConfig?.authConfig?.apiKey as string) || "");
      setApiKeyHeader((initialConfig?.authConfig?.headerName as string) || "x-api-key");
      setBearerToken((initialConfig?.authConfig?.token as string) || "");
      setBasicUsername((initialConfig?.authConfig?.username as string) || "");
      setBasicPassword((initialConfig?.authConfig?.password as string) || "");
      setRateLimit(initialConfig?.rateLimit ?? 100);
      
      // Try to find webhookId from config or from existing webhook
      let foundWebhookId = initialConfig?.webhookId;
      if (!foundWebhookId && initialConfig?.path && existingWebhookQuery.data) {
        const existingWebhook = existingWebhookQuery.data.find(
          w => w.path === initialConfig.path && w.workflowId === workflowId
        );
        if (existingWebhook) {
          foundWebhookId = existingWebhook.id;
        }
      }
      setWebhookId(foundWebhookId);
      
    }
  }, [open, initialConfig, initialLabel, existingWebhookQuery.data, workflowId]);

  // Cleanup polling on unmount or when listening stops
  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  // Stop listening when dialog closes
  useEffect(() => {
    if (!open && isListening) {
      handleStopListening();
    }
  }, [open]);

  // Always show the URL based on path (not just when saved)
  const webhookUrl = path.trim()
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/${organizationId}/${path.trim()}`
    : null;

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    
    if (!path.trim()) {
      setError("Please enter a webhook path");
      return;
    }

    // Build auth config based on auth type
    const buildAuthConfig = (): Record<string, unknown> | undefined => {
      switch (authType) {
        case "api_key":
          return apiKey ? { apiKey, headerName: apiKeyHeader } : undefined;
        case "bearer":
          return bearerToken ? { token: bearerToken } : undefined;
        case "basic":
          return basicUsername && basicPassword 
            ? { username: basicUsername, password: basicPassword } 
            : undefined;
        default:
          return undefined;
      }
    };

    const authConfig = buildAuthConfig();

    try {
      
      
      if (webhookId) {
        // Update existing webhook
        await updateMutation.mutateAsync({
          organizationId,
          id: webhookId,
          responseMode,
          authType,
          authConfig,
          rateLimit,
        });
      } else {
        // Create new webhook
        const result = await createMutation.mutateAsync({
          organizationId,
          workflowId,
          path: path.trim(),
          method,
          responseMode,
          authType,
          authConfig,
          rateLimit,
        });
        
        // Check for errors in result
        if (!result.success) {
          setError(result.error || "Failed to create webhook");
          return;
        }
        
        setWebhookId(result.webhook!.id);
      }

      onSave({
        label: label.trim() || "Webhook",
        config: {
          path: path.trim(),
          method,
          responseMode,
          webhookId: webhookId || createMutation.data?.webhook?.id,
          authType,
          authConfig,
          rateLimit,
        },
      });

      await utils.webhooks.list.invalidate({ organizationId });
      setSuccess(webhookId ? "Webhook updated successfully" : "Webhook created successfully");
    } catch (error) {
      console.error("Error saving webhook:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
    }
  };

  const handleCopyUrl = async () => {
    if (webhookUrl) {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendTestPayload = () => {
    const testData = {
      headers: {
        "content-type": "application/json",
        "user-agent": "Typeflow-Test/1.0",
      },
      body: {
        message: "This is a test webhook request",
        timestamp: new Date().toISOString(),
        test: true,
      },
      query: {
        source: "test",
      },
      params: {},
    };
    
    if (onTestFlow) {
      onTestFlow(testData);
      onOpenChange(false);
    }
  };

  const handleStartListening = async () => {
    // First ensure webhook is saved
    let currentWebhookId = webhookId;
    if (!currentWebhookId && path.trim()) {
      const result = await createMutation.mutateAsync({
        organizationId,
        workflowId,
        path: path.trim(),
        method,
      });
      
      if (!result.success) {
        setError(result.error || "Failed to create webhook");
        return;
      }
      
      setWebhookId(result.webhook!.id);
      currentWebhookId = result.webhook!.id;
    }

    if (!currentWebhookId) {
      setError("Please save the webhook first");
      return;
    }
    
    setIsListening(true);
    setReceivedRequest(null);
    
    // Poll for new requests every 2 seconds
    const intervalId = setInterval(async () => {
      try {
        
        const latestRequest = await utils.client.webhooks.getLatestRequest.query({
          organizationId,
          webhookId: currentWebhookId!,
        });

        

        if (latestRequest) {
          const isNewRequest = !receivedRequest || 
            new Date(latestRequest.receivedAt).getTime() > new Date(receivedRequest.receivedAt || 0).getTime();
          
          if (isNewRequest) {
            
            setReceivedRequest(latestRequest);
            
            // Stop listening after receiving request
            clearInterval(intervalId);
            setIsListening(false);
            setPollingIntervalId(null);

            // Auto-execute workflow with the received data
            if (onTestFlow) {
              setTimeout(() => {
                
                onTestFlow({
                  headers: latestRequest.headers as Record<string, string>,
                  body: latestRequest.body as Record<string, unknown>,
                  query: latestRequest.query as Record<string, string>,
                  params: {
                    organizationId,
                    path,
                  },
                  method: latestRequest.method,
                  url: latestRequest.url,
                  webhookId: currentWebhookId,
                });
                // Close dialog after execution starts
                setTimeout(() => onOpenChange(false), 1000);
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error("Error polling for requests:", error);
      }
    }, 2000);

    setPollingIntervalId(intervalId);
  };

  const handleStopListening = () => {
    setIsListening(false);
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-green-500" />
            Configure Webhook
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Basic Configuration */}
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Configuration</h3>
            
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
            
            {/* Success Message */}
            {success && (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-500">{success}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="label">Node Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Webhook"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">HTTP Method</Label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as "GET" | "POST" | "PUT" | "DELETE" | "PATCH")}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responseMode">Response Mode</Label>
                <select
                  id="responseMode"
                  value={responseMode}
                  onChange={(e) => setResponseMode(e.target.value as "waitForResult" | "respondImmediately")}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="waitForResult">Wait for Result</option>
                  <option value="respondImmediately">Respond Immediately</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="path">Webhook Path</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/webhook/</span>
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="unique-path"
                  className="flex-1"
                />
              </div>
            </div>

            {webhookUrl && (
              <div className="p-3 bg-muted/50 border rounded-md space-y-2">
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-background px-2 py-1.5 rounded border break-all">
                    {webhookUrl}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUrl}
                    className="shrink-0 h-8 w-8"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(webhookUrl, "_blank")}
                    className="shrink-0 h-8 w-8"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {copied && <p className="text-xs text-green-500">Copied to clipboard!</p>}
              </div>
            )}
          </div>

          {/* Right Column - Security & Testing */}
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Security & Testing</h3>

            {/* Authentication */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Authentication</Label>
              </div>
              
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value as "none" | "api_key" | "bearer" | "basic")}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="none">None (Public)</option>
                <option value="api_key">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </select>

              {authType === "api_key" && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showToken ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="API Key"
                        className="pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setApiKey(crypto.randomUUID().replace(/-/g, ''))}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <Input
                    value={apiKeyHeader}
                    onChange={(e) => setApiKeyHeader(e.target.value)}
                    placeholder="Header name (x-api-key)"
                  />
                </div>
              )}

              {authType === "bearer" && (
                <div className="flex items-center gap-2 pt-2">
                  <div className="relative flex-1">
                    <Input
                      type={showToken ? "text" : "password"}
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                      placeholder="Bearer Token"
                      className="pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                       {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBearerToken(crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''))}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </div>
              )}

              {authType === "basic" && (
                <div className="space-y-3 pt-2">
                  <Input
                    value={basicUsername}
                    onChange={(e) => setBasicUsername(e.target.value)}
                    placeholder="Username"
                  />
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={basicPassword}
                        onChange={(e) => setBasicPassword(e.target.value)}
                        placeholder="Password"
                        className="pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBasicPassword(crypto.randomUUID().replace(/-/g, '').slice(0, 16))}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Rate Limiting */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Rate Limiting</Label>
              </div>
              
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  max={10000}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">requests per minute</span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Set to 0 for unlimited. Default is 100 requests per minute.
              </p>
            </div>

            {/* Test Webhook */}
            <div className="border rounded-lg p-4 space-y-4">
              <Label className="font-medium mb-2 block">Test Webhook</Label>
              
              <div className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Radio className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Listen for Request</span>
                    <span className="text-xs text-muted-foreground">Wait for incoming event</span>
                  </div>
                </div>
                {!isListening ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleStartListening}
                    disabled={!path.trim()}
                  >
                    Listen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStopListening}
                    className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Stop
                  </Button>
                )}
              </div>

              {isListening && (
                <div className="mx-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded text-xs animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-blue-700 dark:text-blue-400">Listening for events...</span>
                  </div>
                </div>
              )}

              {receivedRequest && (
                <div className="mx-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      Request Received
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(receivedRequest.receivedAt).toLocaleTimeString()}</span>
                  </div>
                  <pre className="text-xs font-mono bg-background p-2 rounded overflow-auto max-h-32 border">
                    {JSON.stringify(receivedRequest, null, 2)}
                  </pre>
                </div>
              )}

              <div className="h-px bg-border" />

              <div className="flex items-center justify-between gap-4 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Send className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Send Test Payload</span>
                    <span className="text-xs text-muted-foreground">Trigger with mock data</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestPayload}
                  disabled={!onTestFlow}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-200 dark:border-green-800"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 mt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || !path.trim()}
            className="min-w-[100px]"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Config"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
