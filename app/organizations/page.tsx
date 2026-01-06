"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Building2, Loader2 } from "lucide-react";

export default function OrganizationsPage() {
  const router = useRouter();
  const {
    data: organizations,
    isLoading,
    error,
  } = trpc.organizations.list.useQuery();

  useEffect(() => {
    if (error?.data?.code === "UNAUTHORIZED") {
      router.push("/login");
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organizations and workflows
          </p>
        </div>
        <Link href="/organizations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </Button>
        </Link>
      </div>

      {!organizations || organizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No organizations yet</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Get started by creating your first organization. Organizations help
            you organize your workflows and collaborate with your team.
          </p>
          <Link href="/organizations/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {org.name}
                </CardTitle>
                <CardDescription>{org.slug}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {org.description ? (
                  <p className="text-sm text-muted-foreground">
                    {org.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No description
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Link href={`/organizations/${org.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
