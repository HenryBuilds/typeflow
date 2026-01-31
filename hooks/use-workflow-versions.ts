import { trpc } from "@/lib/trpc";

export function useWorkflowVersions(workflowId: string, organizationId: string) {
  return trpc.workflowVersions.list.useQuery(
    { workflowId, organizationId },
    { enabled: !!workflowId && !!organizationId }
  );
}

export function useWorkflowVersion(versionId: string | null, organizationId: string) {
  return trpc.workflowVersions.getById.useQuery(
    { id: versionId!, organizationId },
    { enabled: !!versionId && !!organizationId }
  );
}

export function useCreateWorkflowVersion() {
  const utils = trpc.useUtils();
  return trpc.workflowVersions.create.useMutation({
    onSuccess: (_, variables) => {
      utils.workflowVersions.list.invalidate({ workflowId: variables.workflowId, organizationId: variables.organizationId });
    },
  });
}

export function useUpdateWorkflowVersion() {
  const utils = trpc.useUtils();
  return trpc.workflowVersions.update.useMutation({
    onSuccess: (data) => {
      utils.workflowVersions.list.invalidate({ workflowId: data.workflowId, organizationId: data.organizationId });
      utils.workflowVersions.getById.invalidate({ id: data.id, organizationId: data.organizationId });
    },
  });
}

export function useDeleteWorkflowVersion() {
  const utils = trpc.useUtils();
  return trpc.workflowVersions.delete.useMutation({
    onSuccess: () => {
      // We don't know the workflowId here, so invalidate all
      utils.workflowVersions.list.invalidate();
    },
  });
}

export function useRestoreWorkflowVersion() {
  const utils = trpc.useUtils();
  return trpc.workflowVersions.restore.useMutation({
    onSuccess: (data, variables) => {
      utils.workflows.getById.invalidate({ id: data.workflowId, organizationId: variables.organizationId });
      utils.workflowVersions.list.invalidate({ workflowId: data.workflowId, organizationId: variables.organizationId });
    },
  });
}
