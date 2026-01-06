"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
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

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [debouncedSlug, setDebouncedSlug] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.organizations.create.useMutation({
    onSuccess: async (org) => {
      await utils.organizations.list.invalidate();
      await utils.organizations.getById.invalidate({ id: org.id });
      router.push(`/organizations/${org.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const { data: slugAvailability, isLoading: isCheckingSlug } =
    trpc.organizations.checkSlugAvailability.useQuery(
      { slug: debouncedSlug },
      {
        enabled: debouncedSlug.length > 0,
        retry: false,
      }
    );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSlug(slug);
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSlugChange = (value: string) => {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(normalized);
  };

  const handleUseSuggestion = () => {
    if (slugAvailability?.suggestedSlug) {
      setSlug(slugAvailability.suggestedSlug);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!slug) {
      setError("Slug is required");
      return;
    }

    if (!slugAvailability?.available && slugAvailability?.suggestedSlug) {
      setError("Please use the suggested slug or choose a different one");
      return;
    }

    createMutation.mutate({
      name,
      slug,
      description: description || undefined,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create organization</CardTitle>
          <CardDescription>
            Create a new organization to get started
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
                Organization name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Inc"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) {
                    handleSlugChange(e.target.value);
                  }
                }}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <Input
                id="slug"
                type="text"
                placeholder="acme-inc"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                disabled={createMutation.isPending}
                className={
                  slug.length > 0 &&
                  !isCheckingSlug &&
                  slugAvailability &&
                  !slugAvailability.available
                    ? "border-destructive"
                    : ""
                }
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  URL-friendly identifier (lowercase, hyphens only)
                </p>
                {slug.length > 0 && !isCheckingSlug && slugAvailability && (
                  <>
                    {slugAvailability.available ? (
                      <p className="text-xs text-green-600">Slug is available</p>
                    ) : slugAvailability.suggestedSlug ? (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-destructive">
                          Slug is already taken
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleUseSuggestion}
                          className="h-6 text-xs"
                        >
                          Use: {slugAvailability.suggestedSlug}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-destructive">
                        Unable to suggest alternative slug
                      </p>
                    )}
                  </>
                )}
                {isCheckingSlug && slug.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Checking availability...
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="description"
                type="text"
                placeholder="A brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create organization"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

