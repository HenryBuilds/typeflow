import { trpc } from "@/lib/trpc";

export function usePackages(organizationId: string) {
  return trpc.packages.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );
}
