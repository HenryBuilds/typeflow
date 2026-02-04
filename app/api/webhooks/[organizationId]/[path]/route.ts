import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { webhooks, workflows, webhookRequests, executions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { WorkflowExecutor } from "@/server/services/workflow-executor";
import { addWorkflowJob } from "@/lib/queue/workflow-queue";
import { createLogger } from "@/lib/logger";
import { webhookRateLimiter, getRateLimitHeaders } from "@/lib/rate-limiter";

const log = createLogger('WebhookHandler');

const ENABLE_QUEUE = process.env.ENABLE_WORKER_QUEUE === "true";

/**
 * Validate webhook authentication based on configured auth type
 * Returns null if authentication passes, error message string if it fails
 */
function validateWebhookAuth(
  request: NextRequest,
  authType: string | null,
  authConfig: Record<string, unknown> | null
): string | null {
  // No authentication required
  if (!authType || authType === "none") {
    return null;
  }

  const authHeader = request.headers.get("authorization") || "";

  switch (authType) {
    case "api_key": {
      // API Key can be in header or query parameter
      const configuredKey = authConfig?.apiKey as string;
      const headerName = (authConfig?.headerName as string) || "x-api-key";
      
      if (!configuredKey) {
        return null; // No key configured, allow request
      }

      // Check header
      const headerKey = request.headers.get(headerName);
      if (headerKey === configuredKey) {
        return null;
      }

      // Check query parameter
      const url = new URL(request.url);
      const queryKey = url.searchParams.get("api_key") || url.searchParams.get("apiKey");
      if (queryKey === configuredKey) {
        return null;
      }

      return "Invalid or missing API key";
    }

    case "bearer": {
      const configuredToken = authConfig?.token as string;
      
      if (!configuredToken) {
        return null; // No token configured, allow request
      }

      if (!authHeader.toLowerCase().startsWith("bearer ")) {
        return "Missing Bearer token";
      }

      const providedToken = authHeader.slice(7); // Remove "Bearer " prefix
      if (providedToken !== configuredToken) {
        return "Invalid Bearer token";
      }

      return null;
    }

    case "basic": {
      const configuredUsername = authConfig?.username as string;
      const configuredPassword = authConfig?.password as string;
      
      if (!configuredUsername || !configuredPassword) {
        return null; // No credentials configured, allow request
      }

      if (!authHeader.toLowerCase().startsWith("basic ")) {
        return "Missing Basic authentication";
      }

      try {
        const base64Credentials = authHeader.slice(6); // Remove "Basic " prefix
        const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
        const [username, password] = credentials.split(":");

        if (username !== configuredUsername || password !== configuredPassword) {
          return "Invalid username or password";
        }

        return null;
      } catch {
        return "Invalid Basic authentication format";
      }
    }

    default:
      // Unknown auth type, allow request (fail-open for unknown types)
      log.warn({ authType }, 'Unknown webhook auth type');
      return null;
  }
}

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; path: string }> }
) {
  const resolvedParams = await params;
  return handleWebhookRequest(request, resolvedParams, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; path: string }> }
) {
  const resolvedParams = await params;
  return handleWebhookRequest(request, resolvedParams, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; path: string }> }
) {
  const resolvedParams = await params;
  return handleWebhookRequest(request, resolvedParams, "PUT");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; path: string }> }
) {
  const resolvedParams = await params;
  return handleWebhookRequest(request, resolvedParams, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; path: string }> }
) {
  const resolvedParams = await params;
  return handleWebhookRequest(request, resolvedParams, "DELETE");
}

async function handleWebhookRequest(
  request: NextRequest,
  params: { organizationId: string; path: string },
  method: string
) {
  try {
    const { organizationId, path } = params;
    log.info({ organizationId, path, method }, 'Incoming webhook request');

    // Find webhook by organization and path (first without isActive check to provide better error messages)
    const webhook = await db.query.webhooks.findFirst({
      where: and(
        eq(webhooks.organizationId, organizationId),
        eq(webhooks.path, path)
      ),
      with: {
        workflow: true,
      },
    });

    if (!webhook) {
      log.warn({ organizationId, path }, 'Webhook not found');
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Rate limiting check using webhook's configured limit
    const webhookLimit = webhook.rateLimit ?? 100; // Default to 100 if not set
    if (webhookLimit > 0) {
      const rateLimitKey = `${organizationId}:${path}`;
      const rateLimitResult = await webhookRateLimiter.checkWithLimit(rateLimitKey, webhookLimit);
      
      if (!rateLimitResult.allowed) {
        log.warn({ organizationId, path, method, limit: webhookLimit }, 'Rate limit exceeded for webhook');
        return new NextResponse(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            message: "Too many requests. Please try again later.",
            retryAfter: rateLimitResult.resetTime - Math.floor(Date.now() / 1000),
          }),
          { 
            status: 429,
            headers: {
              "Content-Type": "application/json",
              ...getRateLimitHeaders(rateLimitResult),
            },
          }
        );
      }
    }

    // Check if webhook is active
    if (!webhook.isActive) {
      log.warn({ organizationId, path, webhookId: webhook.id }, 'Webhook inactive');
      return NextResponse.json(
        { error: "Webhook is inactive. Please activate the workflow to enable this webhook." },
        { status: 403 }
      );
    }



    // Check if the associated workflow is active
    if (!webhook.workflow?.isActive) {
      log.warn({ organizationId, path, workflowId: webhook.workflowId }, 'Workflow inactive for webhook');
      return NextResponse.json(
        { error: "Workflow is inactive. Please activate the workflow to enable this webhook." },
        { status: 403 }
      );
    }

    // Validate webhook authentication (if configured)
    const authError = validateWebhookAuth(request, webhook.authType, webhook.authConfig);
    if (authError) {
      log.warn({ organizationId, path, authType: webhook.authType }, 'Webhook authentication failed');
      return NextResponse.json(
        { error: authError },
        { status: 401 }
      );
    }

    // Check if method matches (if specified in webhook config)
    if (webhook.method && webhook.method !== method) {
      return NextResponse.json(
        { error: `Method not allowed. Expected ${webhook.method}, got ${method}` },
        { status: 405 }
      );
    }

    // Extract request data
    const url = new URL(request.url);
    
    // Collect ALL headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Collect ALL query parameters
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Extract cookies from Cookie header
    const cookies: Record<string, string> = {};
    const cookieHeader = headers["cookie"] || "";
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.split("=");
        if (name && rest.length > 0) {
          cookies[name.trim()] = rest.join("=").trim();
        }
      });
    }

    // Parse request body (support multiple formats)
    let body: any = {};
    let rawBody: string = "";
    const contentType = headers["content-type"] || "";
    
    try {
      rawBody = await request.text();
      
      if (contentType.includes("application/json")) {
        if (rawBody) {
          body = JSON.parse(rawBody);
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        // Parse form data manually from rawBody
        const params = new URLSearchParams(rawBody);
        body = Object.fromEntries(params);
      } else if (contentType.includes("multipart/form-data")) {
        // For multipart, we'd need to parse it differently
        body = { _raw: rawBody, _note: "Multipart form data - see rawBody" };
      } else if (contentType.includes("text/")) {
        body = { text: rawBody };
      } else if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
        body = { xml: rawBody };
      } else {
        // Try to parse as JSON anyway
        if (rawBody) {
          try {
            body = JSON.parse(rawBody);
          } catch {
            body = { raw: rawBody };
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'Error parsing request body');
      body = {};
    }

    // Extract client information
    const clientIp = headers["x-forwarded-for"]?.split(",")[0].trim() || 
                     headers["x-real-ip"] || 
                     "unknown";
    
    const userAgent = headers["user-agent"] || "unknown";
    const referer = headers["referer"] || headers["referrer"] || null;
    const origin = headers["origin"] || null;

    // Prepare comprehensive trigger data with ALL request information
    const triggerData = {
      // Request basics
      method,
      url: url.toString(),
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      
      // Headers (all of them)
      headers,
      
      // Body data
      body,
      rawBody, // Original unparsed body
      
      // Query parameters
      query,
      
      // Cookies
      cookies,
      
      // URL parameters
      params: {
        organizationId,
        path,
      },
      
      // Client information
      client: {
        ip: clientIp,
        userAgent,
        referer,
        origin,
      },
      
      // Metadata
      webhookId: webhook.id,
      receivedAt: new Date().toISOString(),
      contentType,
    };

    

    // Save request to database for listening mode
    try {
      await db.insert(webhookRequests).values({
        webhookId: webhook.id,
        method,
        headers,
        body,
        query,
        cookies: Object.keys(cookies).length > 0 ? cookies : undefined,
        rawBody: rawBody || undefined,
        url: url.toString(),
      });
      
    } catch (error) {
      log.error({ err: error, webhookId: webhook.id }, 'Error saving webhook request');
      // Continue even if saving fails
    }

    // Execute workflow - conditional based on webhook's responseMode setting
    if (ENABLE_QUEUE && webhook.responseMode === "respondImmediately") {
      // Queue-based execution (async) - for "Respond Immediately" mode
      try {
        const job = await addWorkflowJob({
          workflowId: webhook.workflowId,
          organizationId,
          trigger: "webhook",
          input: triggerData,
          webhookPath: path,
        });

        

        return NextResponse.json(
          {
            success: true,
            message: "Workflow queued for execution",
            jobId: job.id,
            status: "queued",
          },
          { status: 202 } // 202 Accepted
        );
      } catch (error) {
        log.error({ err: error, workflowId: webhook.workflowId }, 'Error queuing workflow');
        return NextResponse.json(
          {
            error: "Failed to queue workflow",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Direct execution (sync) - for "Wait for Result" mode (default)

    // Direct execution (sync) - original behavior
    const executor = new WorkflowExecutor();

    // Create execution record BEFORE executing
    const [execution] = await db
      .insert(executions)
      .values({
        organizationId,
        workflowId: webhook.workflowId,
        triggerType: "webhook",
        triggerData,
        status: "running",
        startedAt: new Date(),
      })
      .returning();

    const result = await executor.executeWorkflow(
      webhook.workflowId,
      organizationId,
      triggerData
    );

    

    // Check if workflow execution failed
    const hasFailed = Object.values(result.nodeResults || {}).some(
      (node) => node.status === "failed"
    );

    // Update execution record with results
    const now = new Date();
    await db
      .update(executions)
      .set({
        status: hasFailed ? "failed" : "completed",
        nodeResults: result.nodeResults,
        result: result.finalOutput,
        error: result.error,
        completedAt: now,
        duration: execution.startedAt ? now.getTime() - execution.startedAt.getTime() : 0,
      })
      .where(eq(executions.id, execution.id));

    if (hasFailed) {
      const failedNode = Object.values(result.nodeResults || {}).find(
        (node) => node.status === "failed"
      );
      return NextResponse.json(
        {
          error: "Workflow execution failed",
          message: failedNode?.error || result.error || "One or more nodes failed",
        },
        { status: 500 }
      );
    }

    // Get the final output
    let responseData: unknown = result.finalOutput?.[0]?.json || {
      success: true,
      message: "Workflow executed successfully",
      executionId: result.nodeResults ? Object.keys(result.nodeResults)[0] : undefined
    };

    // If the output has a single 'value' property, unwrap it (this happens when returning primitives)
    if (responseData && typeof responseData === 'object' && responseData !== null && Object.keys(responseData).length === 1 && 'value' in responseData) {
      responseData = (responseData as { value: unknown }).value;
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    log.error({ err: error, params }, 'Webhook execution error');
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
