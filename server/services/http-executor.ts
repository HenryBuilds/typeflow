/**
 * HTTP Executor
 * Handles execution of HTTP Request and Wait nodes
 */

import { nodes } from "@/db/schema";
import type { ExecutionItem } from "@/types/execution";

/**
 * Execute HTTP Request node
 */
export async function executeHttpRequestNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): Promise<ExecutionItem[]> {
  const config = node.config as {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    bodyType?: "json" | "form" | "raw";
    authentication?: "none" | "basic" | "bearer" | "apiKey";
    timeout?: number;
  };

  if (!config?.url) {
    throw new Error("HTTP Request node requires a URL");
  }

  const results: ExecutionItem[] = [];

  for (const item of inputItems) {
    try {
      // Replace placeholders in URL with item data
      let url = config.url;
      for (const [key, value] of Object.entries(item.json)) {
        url = url.replace(`{{${key}}}`, String(value));
      }

      const headers: Record<string, string> = { ...config.headers };

      let body: string | undefined;
      if (config.body && config.method !== "GET" && config.method !== "HEAD") {
        body = config.body;
        // Replace placeholders in body
        for (const [key, value] of Object.entries(item.json)) {
          body = body.replace(`{{${key}}}`, JSON.stringify(value));
        }

        if (config.bodyType === "json" && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeout || 30000);

      const response = await fetch(url, {
        method: config.method || "GET",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      let responseData: unknown;
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      results.push({
        json: {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
        },
      });
    } catch (error) {
      results.push({
        json: {
          error: error instanceof Error ? error.message : String(error),
          input: item.json,
        },
      });
    }
  }

  return results;
}

/**
 * Execute Wait node - pauses execution for a specified time
 */
export async function executeWaitNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[]
): Promise<ExecutionItem[]> {
  const config = node.config as {
    waitTime?: number;
    unit?: "seconds" | "minutes" | "hours" | "days";
  };

  const waitTime = config?.waitTime || 1;
  const unit = config?.unit || "seconds";

  let milliseconds = waitTime * 1000;
  switch (unit) {
    case "minutes": milliseconds = waitTime * 60 * 1000; break;
    case "hours": milliseconds = waitTime * 60 * 60 * 1000; break;
    case "days": milliseconds = waitTime * 24 * 60 * 60 * 1000; break;
  }

  // Cap at 5 minutes for safety
  milliseconds = Math.min(milliseconds, 5 * 60 * 1000);

  await new Promise(resolve => setTimeout(resolve, milliseconds));

  return inputItems;
}
