"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Building2, Users, Settings, Loader2, Workflow, Plus } from "lucide-react";

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    data: organization,
    isLoading: isLoadingOrg,
    error: orgError,
  } = trpc.organizations.getById.useQuery(
    { id },
    {
      enabled: !!id,
    }
  );

  const { data: members, isLoading: isLoadingMembers } =
    trpc.organizations.getMembers.useQuery(
      { organizationId: id },
      {
        enabled: !!id && !!organization,
      }
    );

  const { data: workflows, isLoading: isLoadingWorkflows } =
    trpc.workflows.list.useQuery(
      { organizationId: id },
      {
        enabled: !!id && !!organization,
      }
    );

  useEffect(() => {
    if (orgError?.data?.code === "UNAUTHORIZED") {
      router.push("/login");
    } else if (orgError?.data?.code === "NOT_FOUND") {
      router.push("/organizations");
    }
  }, [orgError, router]);

  if (isLoadingOrg || !organization) {
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
      <div className="mb-6">
        <Link href="/organizations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{organization.name}</h1>
            </div>
            <p className="text-muted-foreground text-lg">{organization.slug}</p>
            {organization.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {organization.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Link href={`/organizations/${id}/workflows/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Workflows
            </CardTitle>
            <CardDescription>
              {isLoadingWorkflows ? (
                "Loading..."
              ) : (
                <>
                  {workflows?.length || 0} workflow
                  {(workflows?.length || 0) !== 1 ? "s" : ""}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingWorkflows ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !workflows || workflows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No workflows yet
                </p>
                <Link href={`/organizations/${id}/workflows/new`}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <Link
                    key={workflow.id}
                    href={`/organizations/${id}/workflows/${workflow.id}`}
                  >
                    <div className="flex items-center justify-between p-3 rounded-md border hover:bg-accent transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          workflow.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {workflow.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members
            </CardTitle>
            <CardDescription>
              {isLoadingMembers ? (
                "Loading..."
              ) : (
                <>
                  {members?.length || 0} member
                  {(members?.length || 0) !== 1 ? "s" : ""}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !members || members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div>
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Organization Details
            </CardTitle>
            <CardDescription>Organization information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Created
              </p>
              <p className="text-sm">
                {new Date(organization.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last Updated
              </p>
              <p className="text-sm">
                {new Date(organization.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {organization.settings && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Settings
                </p>
                <pre className="text-xs mt-1 p-2 rounded bg-muted overflow-auto">
                  {JSON.stringify(organization.settings, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
