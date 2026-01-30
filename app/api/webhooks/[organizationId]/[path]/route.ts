import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { webhooks, workflows, webhookRequests, executions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { WorkflowExecutor } from "@/server/services/workflow-executor";
import { addWorkflowJob } from "@/lib/queue/workflow-queue";
import { createLogger } from "@/lib/logger";

const log = createLogger('WebhookHandler');

const ENABLE_QUEUE = process.env.ENABLE_WORKER_QUEUE === "true";

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
