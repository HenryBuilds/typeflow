"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Webhook, Copy, ExternalLink, Radio, Send } from "lucide-react";
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
    webhookId?: string;
  };
  initialLabel?: string;
  onSave: (data: { label: string; config: { path: string; method: string; webhookId?: string } }) => void;
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
  const [copied, setCopied] = useState(false);
  const [webhookId, setWebhookId] = useState<string | undefined>(initialConfig?.webhookId);
  const [isListening, setIsListening] = useState(false);
  const [receivedRequest, setReceivedRequest] = useState<any>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  const createMutation = trpc.webhooks.create.useMutation();
  const updateMutation = trpc.webhooks.update.useMutation();
  const utils = trpc.useUtils();

  // Generate a random path if not provided
  useEffect(() => {
    if (!path && open) {
      const randomPath = Math.random().toString(36).substring(2, 15);
      setPath(randomPath);
    }
  }, [open, path]);

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
    if (!path.trim()) {
      alert("Please enter a webhook path");
      return;
    }

    try {
      if (webhookId) {
        // Update existing webhook
        await updateMutation.mutateAsync({
          organizationId,
          id: webhookId,
          path: path.trim(),
          method,
        });
      } else {
        // Create new webhook
        const newWebhook = await createMutation.mutateAsync({
          organizationId,
          workflowId,
          path: path.trim(),
          method,
        });
        setWebhookId(newWebhook.id);
      }

      onSave({
        label: label.trim() || "Webhook",
        config: {
          path: path.trim(),
          method,
          webhookId: webhookId || createMutation.data?.id,
        },
      });

      await utils.webhooks.list.invalidate({ organizationId });
    } catch (error) {
      console.error("Error saving webhook:", error);
      alert(`Error saving webhook: ${error instanceof Error ? error.message : "Unknown error"}`);
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
      try {
        const newWebhook = await createMutation.mutateAsync({
          organizationId,
          workflowId,
          path: path.trim(),
          method,
        });
        setWebhookId(newWebhook.id);
        currentWebhookId = newWebhook.id;
      } catch (error) {
        console.error("Error creating webhook:", error);
        alert(`Error creating webhook: ${error instanceof Error ? error.message : "Unknown error"}`);
        return;
      }
    }

    if (!currentWebhookId) {
      alert("Please save the webhook first");
      return;
    }
    
    setIsListening(true);
    setReceivedRequest(null);
    
    // Poll for new requests every 2 seconds
    const intervalId = setInterval(async () => {
      try {
        console.log("Polling for webhook requests...", currentWebhookId);
        const latestRequest = await utils.client.webhooks.getLatestRequest.query({
          organizationId,
          webhookId: currentWebhookId!,
        });

        console.log("Latest request:", latestRequest);

        if (latestRequest) {
          const isNewRequest = !receivedRequest || 
            new Date(latestRequest.receivedAt).getTime() > new Date(receivedRequest.receivedAt || 0).getTime();
          
          if (isNewRequest) {
            console.log("New request detected!");
            setReceivedRequest(latestRequest);
            
            // Stop listening after receiving request
            clearInterval(intervalId);
            setIsListening(false);
            setPollingIntervalId(null);

            // Auto-execute workflow with the received data
            if (onTestFlow) {
              setTimeout(() => {
                console.log("Executing workflow with request data");
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-purple-500" />
            Configure Webhook
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Webhook"
            />
          </div>

          <div>
            <Label htmlFor="method">HTTP Method</Label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as "GET" | "POST" | "PUT" | "DELETE" | "PATCH")}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div>
            <Label htmlFor="path">Webhook Path</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/webhook/</span>
              <Input
                id="path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="unique-path"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This path will be used to receive webhook requests
            </p>
          </div>

          {webhookUrl && (
            <div className="p-3 bg-muted rounded-md">
              <Label className="text-xs text-muted-foreground mb-1 block">Webhook URL</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background px-2 py-1 rounded break-all">
                  {webhookUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(webhookUrl, "_blank")}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold mb-3 block">Test Webhook</Label>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Radio className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Listen for Test Request</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Activate webhook and send a request manually via Postman, cURL, or browser
                    </p>
                  </div>
                  {!isListening ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStartListening}
                      disabled={!path.trim()}
                    >
                      <Radio className="h-4 w-4 mr-1" />
                      Listen
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStopListening}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      Stop
                    </Button>
                  )}
                </div>
                {isListening && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        Listening for requests...
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Send a {method} request to: <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">{webhookUrl}</code>
                    </p>
                  </div>
                )}
                {receivedRequest && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        Request Received
                      </Badge>
                    </div>
                    <pre className="text-xs font-mono bg-background p-2 rounded mt-2 overflow-auto max-h-32">
                      {JSON.stringify(receivedRequest, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="p-3 bg-muted/50 rounded-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Send className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Send Test Payload</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Execute workflow with a demo test payload immediately
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestPayload}
                    disabled={!onTestFlow}
                    className="text-green-600 hover:bg-green-50"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || !path.trim()}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
