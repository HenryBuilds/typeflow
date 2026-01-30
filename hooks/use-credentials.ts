import { trpc } from "@/lib/trpc";

export function useCredentials(organizationId: string, workflowId?: string) {
  return trpc.credentials.list.useQuery({
    organizationId,
    workflowId,
  });
}

export function useDeleteCredential(organizationId: string) {
  const utils = trpc.useUtils();

  return trpc.credentials.delete.useMutation({
    onSuccess: () => {
      utils.credentials.list.invalidate({ organizationId });
    },
  });
}
