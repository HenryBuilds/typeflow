"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { FileType } from "lucide-react";

interface TypeDefinitionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTypes?: string;
  onSave: (types: string) => void;
}

export function TypeDefinitionsDialog({
  open,
  onOpenChange,
  initialTypes = "",
  onSave,
}: TypeDefinitionsDialogProps) {
  const [types, setTypes] = useState(initialTypes);

  useEffect(() => {
    if (open) {
      setTypes(initialTypes);
    }
  }, [open, initialTypes]);

  const handleSave = () => {
    onSave(types);
    onOpenChange(false);
  };

  const defaultTemplate = `// Define your TypeScript types, interfaces, and type aliases here
// These will be available in all code nodes

interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

type Status = "pending" | "completed" | "failed";

type ApiResponse<T> = {
  data: T;
  status: Status;
  message?: string;
};

// Example usage in code nodes:
// const user: User = $json as User;
// const products: Product[] = $input.map(item => item.json as Product);
`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileType className="h-5 w-5" />
            <DialogTitle className="text-xl font-semibold">TypeScript Type Definitions</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Define global types, interfaces, and type aliases that will be available in all code nodes
          </p>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 py-4">
          <Label className="mb-2">Type Definitions</Label>
          <div className="flex-1 border rounded-md overflow-hidden">
            <CodeMirror
              value={types || defaultTemplate}
              height="100%"
              extensions={[javascript({ typescript: true })]}
              theme={oneDark}
              onChange={(value) => setTypes(value)}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
              }}
            />
          </div>
          <div className="mt-3 p-3 bg-muted/50 rounded-md border">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> These type definitions will be prepended to all code nodes during execution.
              Use type assertions (e.g., <code className="px-1 py-0.5 bg-background rounded">as User</code>) or 
              explicit types (e.g., <code className="px-1 py-0.5 bg-background rounded">const user: User = ...</code>) 
              in your code nodes.
            </p>
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0 gap-2">
          <Button 
            variant="outline" 
            onClick={() => setTypes(defaultTemplate)}
          >
            Load Template
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Type Definitions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

