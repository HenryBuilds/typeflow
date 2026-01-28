import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export function useWorkflows(organizationId: string) {
  return trpc.workflows.list.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
    }
  );
}

export function useWorkflow(organizationId: string, id: string) {
  return trpc.workflows.getById.useQuery(
    { organizationId, id },
    {
      enabled: !!organizationId && !!id,
      retry: false,
    }
  );
}

export function useCreateWorkflow(organizationId: string) {
  const router = useRouter();
  const utils = trpc.useUtils();

  return trpc.workflows.create.useMutation({
    onSuccess: async (workflow) => {
      await utils.workflows.list.invalidate({ organizationId });
      router.push(`/organizations/${organizationId}/workflows/${workflow.id}`);
    },
  });
}

export function useUpdateWorkflow(organizationId: string) {
  const utils = trpc.useUtils();

  return trpc.workflows.update.useMutation({
    onSuccess: async (workflow) => {
      await utils.workflows.list.invalidate({ organizationId });
      await utils.workflows.getById.invalidate({
        organizationId,
        id: workflow.id,
      });
    },
    onMutate: async (variables) => {
      await utils.workflows.getById.cancel({
        organizationId,
        id: variables.id,
      });

      const previousWorkflow = utils.workflows.getById.getData({
        organizationId,
        id: variables.id,
      });

      if (previousWorkflow) {
        utils.workflows.getById.setData(
          {
            organizationId,
            id: variables.id,
          },
          {
            ...previousWorkflow,
            ...variables,
          }
        );
      }

      return { previousWorkflow };
    },
    onError: (err, variables, context) => {
      if (context?.previousWorkflow) {
        utils.workflows.getById.setData(
          {
            organizationId,
            id: variables.id,
          },
          context.previousWorkflow
        );
      }
    },
  });
}

export function useDeleteWorkflow(organizationId: string) {
  const router = useRouter();
  const utils = trpc.useUtils();

  return trpc.workflows.delete.useMutation({
    onSuccess: async () => {
      await utils.workflows.list.invalidate({ organizationId });
      router.push(`/organizations/${organizationId}`);
    },
    onMutate: async (variables) => {
      await utils.workflows.list.cancel({ organizationId });

      const previousWorkflows = utils.workflows.list.getData({
        organizationId,
      });

      if (previousWorkflows) {
        utils.workflows.list.setData(
          { organizationId },
          previousWorkflows.filter((w) => w.id !== variables.id)
        );
      }

      return { previousWorkflows };
    },
    onError: (err, variables, context) => {
      if (context?.previousWorkflows) {
        utils.workflows.list.setData(
          { organizationId },
          context.previousWorkflows
        );
      }
    },
  });
}

export function useSaveWorkflow(organizationId: string) {
  const utils = trpc.useUtils();

  return trpc.workflows.save.useMutation({
    onSuccess: async (result) => {
      await utils.workflows.list.invalidate({ organizationId });
      if (result.id) {
        await utils.workflows.getById.invalidate({
          organizationId,
          id: result.id,
        });
      }
    },
  });
}
