import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/queue/workflow-queue";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const status = await getJobStatus(jobId);

    if (!status) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
