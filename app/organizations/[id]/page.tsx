"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useOrganization, useOrganizationMembers, useCreateInviteLink, useRemoveMember } from "@/hooks/use-organizations";
import { useWorkflows, useDeleteWorkflow } from "@/hooks/use-workflows";
import { useCredentials } from "@/hooks/use-credentials";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Building2, Users, Settings, Loader2, Workflow, Plus, Key, Trash2, Copy, Check, Link2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    data: organization,
    isLoading: isLoadingOrg,
    error: orgError,
  } = useOrganization(id);

  const { data: members, isLoading: isLoadingMembers } =
    useOrganizationMembers(id);

  const { data: workflows, isLoading: isLoadingWorkflows } =
    useWorkflows(id);

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentials(id);

  const deleteWorkflow = useDeleteWorkflow(id);
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string; name: string } | null>(null);

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
                  <div
                    key={workflow.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-accent transition-colors"
                  >
                    <Link
                      href={`/organizations/${id}/workflows/${workflow.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          workflow.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {workflow.isActive ? "Active" : "Inactive"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setWorkflowToDelete({ id: workflow.id, name: workflow.name });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <MembersCard organizationId={id} members={members} isLoading={isLoadingMembers} />

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Credentials
            </CardTitle>
            <CardDescription>
              {isLoadingCredentials ? (
                "Loading..."
              ) : (
                <>
                  {credentials?.length || 0} credential
                  {(credentials?.length || 0) !== 1 ? "s" : ""}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCredentials ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Manage database connections and API credentials
                </p>
                <Link href={`/organizations/${id}/credentials`}>
                  <Button variant="outline" size="sm">
                    <Key className="h-4 w-4 mr-2" />
                    Manage Credentials
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Workflow Confirmation Dialog */}
      <Dialog open={!!workflowToDelete} onOpenChange={(open) => !open && setWorkflowToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workflow löschen</DialogTitle>
            <DialogDescription>
              Bist du sicher, dass du den Workflow &quot;{workflowToDelete?.name}&quot; löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWorkflowToDelete(null)}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (workflowToDelete) {
                  deleteWorkflow.mutate({ id: workflowToDelete.id, organizationId: id });
                  setWorkflowToDelete(null);
                }
              }}
              disabled={deleteWorkflow.isPending}
            >
              {deleteWorkflow.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Löschen...
                </>
              ) : (
                "Löschen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate MembersCard component for invite link functionality

interface MembersCardProps {
  organizationId: string;
  members: Array<{
    id: string;
    role: string;
    user: { name: string | null; email: string };
  }> | undefined;
  isLoading: boolean;
}

function MembersCard({ organizationId, members, isLoading }: MembersCardProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const createInvite = useCreateInviteLink(organizationId);
  const removeMemberMutation = useRemoveMember(organizationId);

  const handleCreateInvite = () => {
    setShowInviteDialog(true);
    createInvite.mutate({ organizationId, role: "member" }, {
      onSuccess: (invite) => {
        const link = `${window.location.origin}/invite/${invite.code}`;
        setInviteLink(link);
      },
    });
  };

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate({ organizationId, memberId: memberToRemove.id }, {
        onSuccess: () => setMemberToRemove(null),
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
              </CardTitle>
              <CardDescription>
                {isLoading ? (
                  "Loading..."
                ) : (
                  <>
                    {members?.length || 0} member
                    {(members?.length || 0) !== 1 ? "s" : ""}
                  </>
                )}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCreateInvite}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                      {member.role}
                    </span>
                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(member.id, member.user.name || member.user.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Link Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Invite Link
            </DialogTitle>
            <DialogDescription>
              Share this link to invite new members to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createInvite.isPending ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : inviteLink ? (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Anyone with this link can join as a member.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{memberToRemove?.name}&quot; from the organization?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveMember}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


