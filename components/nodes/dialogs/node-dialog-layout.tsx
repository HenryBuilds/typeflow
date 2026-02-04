"use client";

import { ReactNode, useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VariableSidebar } from "./variable-sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputDataItem } from "./types";

interface NodeDialogLayoutProps {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  sidebar?: {
    inputData: InputDataItem[];
    sourceNodeLabels: Record<string, string>;
    organizationId?: string;
    workflowId?: string;
  };
  className?: string;
}

export function NodeDialogLayout({
  children,
  title,
  icon,
  sidebar,
  className,
}: NodeDialogLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // If sidebar data is present, we use a wider layout
  const hasSidebar = !!sidebar;

  return (
    <DialogContent 
      className={cn(
        "flex flex-col p-0 gap-0 h-[90vh]", 
        hasSidebar ? "max-w-[95vw] sm:max-w-7xl" : "max-w-2xl",
        className
      )}
    >
      <DialogHeader className="px-6 py-4 border-b flex-shrink-0 flex flex-row items-center gap-2 space-y-0">
        <DialogTitle className="flex items-center gap-2 flex-1">
          {icon}
          {title}
        </DialogTitle>
        {hasSidebar && !sidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            title="Open Variables Sidebar"
            className="ml-auto"
          >
            <PanelLeftOpen className="h-4 w-4 mr-2" />
            Variables
          </Button>
        )}
      </DialogHeader>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar */}
        {hasSidebar && (
          <VariableSidebar
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            inputData={sidebar.inputData}
            sourceNodeLabels={sidebar.sourceNodeLabels}
            organizationId={sidebar.organizationId}
            workflowId={sidebar.workflowId}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </DialogContent>
  );
}
