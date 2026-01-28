import { Worker, Job } from "bullmq";
import { getRedisConnection, closeRedisConnection } from "../lib/queue/connection";
import { WorkflowJobData, WorkflowJobResult } from "../lib/queue/types";
import { WorkflowExecutor } from "../server/services/workflow-executor";

const QUEUE_NAME = "workflow-queue";
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "5", 10);



const executor = new WorkflowExecutor();

async function processWorkflowJob(
  job: Job<WorkflowJobData, WorkflowJobResult>
): Promise<WorkflowJobResult> {
  const { workflowId, organizationId, trigger, input, userId } = job.data;

  

  const startTime = Date.now();

  try {
    // Execute the workflow
    const result = await executor.executeWorkflow(
      workflowId,
      organizationId,
      input
    );

    const executionTime = Date.now() - startTime;

    if (!result.success) {
      console.error(
        `[WORKER] Job ${job.id} failed: ${result.error || "Unknown error"}`
      );
      return {
        success: false,
        outputs: {},
        executionTime,
        error: result.error || "Workflow execution failed",
        nodeResults: result.nodeResults,
      };
    }

    

    // Convert finalOutput array to object for consistency
    const outputs = Array.isArray(result.finalOutput)
      ? { items: result.finalOutput }
      : ((result.finalOutput as unknown) as Record<string, unknown>) || {};

    return {
      success: true,
      outputs,
      executionTime,
      nodeResults: result.nodeResults,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error(`[WORKER] Job ${job.id} threw error:`, errorMessage);

    return {
      success: false,
      outputs: {},
      executionTime,
      error: errorMessage,
    };
  }
}

// Create worker
const worker = new Worker<WorkflowJobData, WorkflowJobResult>(
  QUEUE_NAME,
  processWorkflowJob,
  {
    connection: getRedisConnection(),
    concurrency: CONCURRENCY,
    limiter: {
      max: 10,
      duration: 1000, // Max 10 jobs per second
    },
  }
);

// Worker event handlers
worker.on("completed", (job) => {
  
});

worker.on("failed", (job, error) => {
  console.error(`[WORKER] Job ${job?.id} failed:`, error.message);
});

worker.on("error", (error) => {
  console.error("[WORKER] Worker error:", error);
});

worker.on("ready", () => {
  
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  

  try {
    await worker.close();
    

    await closeRedisConnection();
    

    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));


