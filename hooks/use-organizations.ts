import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export function useOrganizations() {
  return trpc.organizations.list.useQuery();
}

export function useOrganization(id: string) {
  return trpc.organizations.getById.useQuery(
    { id },
    {
      enabled: !!id,
    }
  );
}

export function useOrganizationMembers(organizationId: string) {
  const { data: organization } = useOrganization(organizationId);
  return trpc.organizations.getMembers.useQuery(
    { organizationId },
    {
      enabled: !!organizationId && !!organization,
    }
  );
}

export function useCreateOrganization() {
  const router = useRouter();
  const utils = trpc.useUtils();

  return trpc.organizations.create.useMutation({
    onSuccess: async (org) => {
      await utils.organizations.list.invalidate();
      await utils.organizations.getById.invalidate({ id: org.id });
      router.push(`/organizations/${org.id}`);
    },
  });
}

export function useCheckSlugAvailability(slug: string) {
  return trpc.organizations.checkSlugAvailability.useQuery(
    { slug },
    {
      enabled: slug.length > 0,
      retry: false,
    }
  );
}
