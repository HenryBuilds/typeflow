import { Queue, Job } from "bullmq";
import { getRedisConnection } from "./connection";
import { WorkflowJobData, WorkflowJobResult, JobState } from "./types";

const QUEUE_NAME = "workflow-queue";

let workflowQueue: Queue<WorkflowJobData, WorkflowJobResult> | null = null;

export function getWorkflowQueue(): Queue<WorkflowJobData, WorkflowJobResult> {
  if (workflowQueue) {
    return workflowQueue;
  }

  const connection = getRedisConnection();

  workflowQueue = new Queue<WorkflowJobData, WorkflowJobResult>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

  return workflowQueue;
}

export interface AddWorkflowJobOptions {
  priority?: number;
  delay?: number;
  jobId?: string;
}

export async function addWorkflowJob(
  data: WorkflowJobData,
  options?: AddWorkflowJobOptions
): Promise<Job<WorkflowJobData, WorkflowJobResult>> {
  const queue = getWorkflowQueue();

  const job = await queue.add("execute-workflow", data, {
    jobId: options?.jobId,
    priority: options?.priority,
    delay: options?.delay,
  });

  console.log(`[QUEUE] Queued workflow job ${job.id} for workflow ${data.workflowId}`);

  return job;
}

export async function getJobStatus(
  jobId: string
): Promise<{
  id: string;
  state: JobState;
  progress: number;
  result?: WorkflowJobResult;
  failedReason?: string;
  attemptsMade: number;
  data: WorkflowJobData;
} | null> {
  const queue = getWorkflowQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = (await job.getState()) as JobState;
  const progress = job.progress as number;
  const failedReason = job.failedReason;
  const attemptsMade = job.attemptsMade;

  return {
    id: job.id!,
    state,
    progress,
    result: job.returnvalue,
    failedReason,
    attemptsMade,
    data: job.data,
  };
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getWorkflowQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

export async function cleanQueue(
  grace: number = 24 * 3600 * 1000
): Promise<void> {
  const queue = getWorkflowQueue();
  await queue.clean(grace, 1000, "completed");
  await queue.clean(grace * 7, 1000, "failed");
  console.log("[QUEUE] Queue cleaned");
}

export async function closeQueue(): Promise<void> {
  if (workflowQueue) {
    await workflowQueue.close();
    workflowQueue = null;
  }
}
