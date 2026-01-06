"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useCreateWorkflow } from "@/hooks/use-workflows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Workflow } from "lucide-react";
import Link from "next/link";

export default function NewWorkflowPage() {
  const params = useParams();
  const organizationId = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [error, setError] = useState("");

  const createMutation = useCreateWorkflow(organizationId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Workflow name is required");
      return;
    }

    createMutation.mutate(
      {
        organizationId,
        name: name.trim(),
        description: description.trim() || undefined,
        version: version.trim() || "1.0.0",
      },
      {
        onError: (err) => {
          setError(err.message);
        },
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/organizations/${organizationId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organization
          </Button>
        </Link>
      </div>

      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Create Workflow
            </CardTitle>
            <CardDescription>
              Create a new workflow for your organization
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Workflow name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="My Workflow"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Input
                  id="description"
                  type="text"
                  placeholder="A brief description of the workflow"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="version" className="text-sm font-medium">
                  Version
                </label>
                <Input
                  id="version"
                  type="text"
                  placeholder="1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={createMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Semantic version (e.g., 1.0.0)
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Workflow"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
