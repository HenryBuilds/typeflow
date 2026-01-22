"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Package, Search, Trash2, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PackagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function PackagesDialog({
  open,
  onOpenChange,
  organizationId,
}: PackagesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"installed" | "search">("installed");

  const utils = trpc.useUtils();

  // Query installed packages
  const { data: installedPackages, isLoading: loadingInstalled } = trpc.packages.list.useQuery(
    { organizationId },
    { enabled: open }
  );

  // Search packages (only when search tab is active and query is not empty)
  const { data: searchResults, isLoading: searchingPackages } = trpc.packages.search.useQuery(
    { organizationId, query: searchQuery, limit: 20 },
    { enabled: open && activeTab === "search" && searchQuery.length > 0 }
  );

  // Install package mutation
  const installMutation = trpc.packages.install.useMutation({
    onSuccess: () => {
      utils.packages.list.invalidate();
      setInstallingPackage(null);
      setActiveTab("installed");
    },
    onError: (error) => {
      alert(`Failed to install package: ${error.message}`);
      setInstallingPackage(null);
    },
  });

  // Uninstall package mutation
  const uninstallMutation = trpc.packages.uninstall.useMutation({
    onSuccess: () => {
      utils.packages.list.invalidate();
    },
    onError: (error) => {
      alert(`Failed to uninstall package: ${error.message}`);
    },
  });

  const handleInstall = async (packageName: string, version?: string) => {
    setInstallingPackage(packageName);
    await installMutation.mutateAsync({
      organizationId,
      name: packageName,
      version,
    });
  };

  const handleUninstall = async (packageName: string) => {
    if (confirm(`Are you sure you want to uninstall ${packageName}?`)) {
      await uninstallMutation.mutateAsync({ 
        organizationId,
        name: packageName 
      });
    }
  };

  const isPackageInstalled = (packageName: string) => {
    return installedPackages?.some((pkg) => pkg.name === packageName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <DialogTitle className="text-xl font-semibold">Package Manager</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Install and manage npm packages for your workflows
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-3 border-b">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="installed">
                Installed ({installedPackages?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="search">Search Packages</TabsTrigger>
            </TabsList>
          </div>

          {/* Installed Packages Tab */}
          <TabsContent value="installed" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
            {loadingInstalled ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : installedPackages && installedPackages.length > 0 ? (
              <div className="space-y-3">
                {installedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono font-semibold">{pkg.name}</h3>
                        <Badge variant="secondary">{pkg.version}</Badge>
                        {pkg.isActive && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Installed {new Date(pkg.installedAt).toLocaleDateString()}
                      </p>
                      {pkg.dependencies && Object.keys(pkg.dependencies).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Dependencies: {Object.keys(pkg.dependencies).length}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUninstall(pkg.name)}
                      disabled={uninstallMutation.isPending}
                    >
                      {uninstallMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Uninstall
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No packages installed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Search and install packages to use them in your workflows
                </p>
                <Button onClick={() => setActiveTab("search")}>
                  <Search className="h-4 w-4 mr-2" />
                  Search Packages
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Search Packages Tab */}
          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="px-6 py-4 border-b flex-shrink-0">
              <Label htmlFor="package-search" className="text-sm font-medium mb-2 block">
                Search npm packages
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="package-search"
                    placeholder="e.g., lodash, axios, moment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {searchQuery.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Search for packages</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter a package name to search npm registry
                  </p>
                </div>
              ) : searchingPackages ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((pkg) => {
                    const installed = isPackageInstalled(pkg.name);
                    const installing = installingPackage === pkg.name;

                    return (
                      <div
                        key={pkg.name}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-mono font-semibold">{pkg.name}</h3>
                            <Badge variant="outline">{pkg.version}</Badge>
                            {installed && (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Installed
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {pkg.description || "No description available"}
                          </p>
                        </div>
                        <Button
                          variant={installed ? "secondary" : "default"}
                          size="sm"
                          onClick={() => handleInstall(pkg.name, pkg.version)}
                          disabled={installed || installing}
                        >
                          {installing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Installing...
                            </>
                          ) : installed ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Installed
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              Install
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try a different search term
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="px-6 py-4 border-t flex-shrink-0 flex justify-between items-center bg-muted/20">
          <div className="text-xs text-muted-foreground">
            💡 Installed packages can be imported using <code className="px-1 py-0.5 bg-background rounded">require()</code> or <code className="px-1 py-0.5 bg-background rounded">import</code>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

