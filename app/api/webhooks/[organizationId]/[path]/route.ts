import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { webhooks, workflows, webhookRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { WorkflowExecutor } from "@/server/services/workflow-executor";

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

    console.log(`Webhook request received: ${method} ${organizationId}/${path}`);

    // Find webhook by organization and path
    const webhook = await db.query.webhooks.findFirst({
      where: and(
        eq(webhooks.organizationId, organizationId),
        eq(webhooks.path, path),
        eq(webhooks.isActive, true)
      ),
      with: {
        workflow: true,
      },
    });

    if (!webhook) {
      console.error(`Webhook not found: ${organizationId}/${path}`);
      return NextResponse.json(
        { error: "Webhook not found or inactive" },
        { status: 404 }
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
      console.error("Error parsing request body:", error);
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

    console.log("Trigger data:", JSON.stringify(triggerData, null, 2));

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
      console.log("Webhook request saved to database with all data");
    } catch (error) {
      console.error("Error saving webhook request:", error);
      // Continue even if saving fails
    }

    // Execute workflow
    const executor = new WorkflowExecutor();
    const result = await executor.executeWorkflow(
      webhook.workflowId,
      organizationId,
      triggerData
    );

    console.log("Workflow execution result:", result);

    // Check if workflow execution failed
    const hasFailed = Object.values(result.nodeResults || {}).some(
      (node) => node.status === "failed"
    );

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
    let responseData = result.finalOutput?.[0]?.json || { 
      success: true,
      message: "Workflow executed successfully",
      executionId: result.nodeResults ? Object.keys(result.nodeResults)[0] : undefined
    };
    
    // If the output has a single 'value' property, unwrap it (this happens when returning primitives)
    if (responseData && typeof responseData === 'object' && Object.keys(responseData).length === 1 && 'value' in responseData) {
      responseData = responseData.value;
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Webhook execution error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
