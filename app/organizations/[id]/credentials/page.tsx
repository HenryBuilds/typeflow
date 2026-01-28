"use client";

import { useParams } from "next/navigation";
import { useCredentials, useDeleteCredential } from "@/hooks/use-credentials";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Database, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { CredentialDialog } from "@/components/credential-dialog";

export default function CredentialsPage() {
  const params = useParams();
  const organizationId = params.id as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<string | null>(null);

  const { data: credentials, isLoading } = useCredentials(organizationId);

  const deleteMutation = useDeleteCredential(organizationId);

  const handleDelete = async (credentialId: string) => {
    if (confirm("Are you sure you want to delete this credential?")) {
      await deleteMutation.mutateAsync({ organizationId, credentialId });
    }
  };

  const handleEdit = (credentialId: string) => {
    setEditingCredential(credentialId);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCredential(null);
    setIsDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    return <Database className="w-5 h-5" />;
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "postgres":
        return "bg-blue-100 text-blue-800";
      case "mysql":
        return "bg-orange-100 text-orange-800";
      case "mongodb":
        return "bg-green-100 text-green-800";
      case "redis":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Credentials</h1>
          <p className="text-gray-600 mt-1">
            Manage database connections and API credentials for your workflows
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Credential
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : credentials && credentials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {credentials.map((cred) => (
            <Card key={cred.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getTypeIcon(cred.type)}
                  <div>
                    <h3 className="font-semibold text-lg">{cred.name}</h3>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(
                        cred.type
                      )}`}
                    >
                      {cred.type}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(cred.id)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cred.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {cred.description && (
                <p className="text-sm text-gray-600">{cred.description}</p>
              )}
              <div className="mt-3 text-xs text-gray-500">
                Created: {new Date(cred.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No credentials yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first credential to connect to databases and external services
          </p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Credential
          </Button>
        </Card>
      )}

      <CredentialDialog
        organizationId={organizationId}
        credentialId={editingCredential}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingCredential(null);
        }}
      />
    </div>
  );
}
