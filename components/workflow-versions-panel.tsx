"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  RotateCcw,
  Trash2,
  Edit2,
  Plus,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import {
  useWorkflowVersions,
  useCreateWorkflowVersion,
  useDeleteWorkflowVersion,
  useRestoreWorkflowVersion,
  useUpdateWorkflowVersion,
} from "@/hooks/use-workflow-versions";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface WorkflowVersionsPanelProps {
  workflowId: string;
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionRestored?: () => void;
}

export function WorkflowVersionsPanel({
  workflowId,
  organizationId,
  isOpen,
  onClose,
  onVersionRestored,
}: WorkflowVersionsPanelProps) {
  const { data: versions, isLoading } = useWorkflowVersions(workflowId, organizationId);
  const createVersion = useCreateWorkflowVersion();
  const deleteVersion = useDeleteWorkflowVersion();
  const restoreVersion = useRestoreWorkflowVersion();
  const updateVersion = useUpdateWorkflowVersion();

  const [editingVersion, setEditingVersion] = useState<{
    id: string;
    name: string;
    notes: string;
  } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionNotes, setNewVersionNotes] = useState("");

  const handleCreateVersion = async () => {
    await createVersion.mutateAsync({
      organizationId,
      workflowId,
      name: newVersionName || undefined,
      notes: newVersionNotes || undefined,
    });
    setCreateDialogOpen(false);
    setNewVersionName("");
    setNewVersionNotes("");
  };

  const handleRestore = async (versionId: string) => {
    await restoreVersion.mutateAsync({
      organizationId,
      versionId,
      createBackupVersion: true,
    });
    setConfirmRestore(null);
    onVersionRestored?.();
  };

  const handleDelete = async (versionId: string) => {
    await deleteVersion.mutateAsync({ organizationId, id: versionId });
    setConfirmDelete(null);
  };

  const handleUpdateVersion = async () => {
    if (!editingVersion) return;
    await updateVersion.mutateAsync({
      organizationId,
      id: editingVersion.id,
      name: editingVersion.name || undefined,
      notes: editingVersion.notes || undefined,
    });
    setEditingVersion(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h2 className="font-semibold">Version History</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Create Version Button */}
      <div className="p-4 border-b">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setCreateDialogOpen(true)}
          disabled={createVersion.isPending}
        >
          {createVersion.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Create Snapshot
        </Button>
      </div>

      {/* Versions List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (!versions || versions.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No versions yet</p>
              <p className="text-xs mt-1">
                Versions are created automatically when you save
              </p>
            </div>
          )}

          {versions?.map((version) => (
            <div
              key={version.id}
              className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      v{version.versionNumber}
                    </span>
                    {version.name && (
                      <span className="text-sm text-muted-foreground truncate">
                        {version.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(version.createdAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </div>
                  {version.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {version.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setConfirmRestore(version.id)}
                  disabled={restoreVersion.isPending}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setEditingVersion({
                      id: version.id,
                      name: version.name || "",
                      notes: version.notes || "",
                    })
                  }
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(version.id)}
                  disabled={deleteVersion.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Create Version Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Version Snapshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version-name">Name (optional)</Label>
              <Input
                id="version-name"
                placeholder="e.g., Before refactoring"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-notes">Notes (optional)</Label>
              <Input
                id="version-notes"
                placeholder="Describe what changed..."
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVersion} disabled={createVersion.isPending}>
              {createVersion.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Version Dialog */}
      <Dialog open={!!editingVersion} onOpenChange={() => setEditingVersion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-version-name">Name</Label>
              <Input
                id="edit-version-name"
                value={editingVersion?.name || ""}
                onChange={(e) =>
                  setEditingVersion((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-version-notes">Notes</Label>
              <Input
                id="edit-version-notes"
                value={editingVersion?.notes || ""}
                onChange={(e) =>
                  setEditingVersion((prev) =>
                    prev ? { ...prev, notes: e.target.value } : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVersion(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateVersion} disabled={updateVersion.isPending}>
              {updateVersion.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Restore Dialog */}
      <Dialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will replace your current workflow with this version. A backup of
            your current state will be created automatically.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmRestore && handleRestore(confirmRestore)}
              disabled={restoreVersion.isPending}
            >
              {restoreVersion.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Version?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This version will be permanently deleted. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={deleteVersion.isPending}
            >
              {deleteVersion.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
