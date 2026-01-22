"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { linter } from "@codemirror/lint";
import { autocompletion } from "@codemirror/autocomplete";
import { FileType, Loader2 } from "lucide-react";
import { createTypeDefinitionsLinter, typescriptKeywords, parseTypeDefinitions } from "@/lib/typescript-linter";

interface TypeDefinitionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTypes?: string;
  onSave: (types: string) => void | Promise<void>;
}

export function TypeDefinitionsDialog({
  open,
  onOpenChange,
  initialTypes = "",
  onSave,
}: TypeDefinitionsDialogProps) {
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

  const [types, setTypes] = useState(initialTypes || defaultTemplate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      console.log('Type Definitions Dialog opened with initialTypes:', initialTypes ? initialTypes.substring(0, 100) + '...' : 'empty/undefined');
      // Use initialTypes if provided, otherwise use default template
      setTypes(initialTypes || defaultTemplate);
      setIsSaving(false); // Reset saving state when dialog opens
    }
  }, [open, initialTypes, defaultTemplate]);

  // Parse existing types for autocomplete
  const existingTypes = useMemo(() => {
    return parseTypeDefinitions(types);
  }, [types]);

  // Create TypeScript autocomplete
  const typeScriptAutocomplete = useMemo(() => {
    return autocompletion({
      activateOnTyping: true,
      override: [
        // Autocomplete for TypeScript keywords and types
        (context) => {
          const word = context.matchBefore(/\w*/);
          if (!word) return null;
          
          if (word.from === word.to && !context.explicit) return null;
          
          // Combine keywords with existing types
          const allCompletions = [
            ...typescriptKeywords,
            ...existingTypes.map(t => ({
              label: t.label,
              type: t.type,
              info: t.info,
              boost: 99, // Custom types get higher priority
            })),
          ];
          
          return {
            from: word.from,
            options: allCompletions,
          };
        },
        // Autocomplete after 'interface' or 'type' keywords
        (context) => {
          const line = context.state.doc.lineAt(context.pos);
          const textBefore = line.text.slice(0, context.pos - line.from);
          
          if (/\binterface\s+$/.test(textBefore) || /\btype\s+$/.test(textBefore)) {
            return {
              from: context.pos,
              options: [
                { label: 'MyType', type: 'snippet', info: 'Type name (customize)' },
                { label: 'MyInterface', type: 'snippet', info: 'Interface name (customize)' },
              ],
            };
          }
          
          return null;
        },
      ],
    });
  }, [existingTypes]);

  // Create TypeScript linter
  const typeScriptLinter = useMemo(() => {
    return linter(createTypeDefinitionsLinter());
  }, []);

  const handleSave = async () => {
    console.log('Dialog handleSave called');
    console.log('Current types state length:', types.length);
    console.log('Current types state preview:', types.substring(0, 200));
    console.log('Saving type definitions from dialog:', types ? types.substring(0, 100) + '...' : 'EMPTY OR UNDEFINED');
    
    if (!types || types.trim() === '') {
      console.error('Types are empty! Not saving.');
      alert('Type definitions are empty. Please add some types before saving.');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(types);
      console.log('Type definitions saved successfully, closing dialog');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save type definitions:', error);
      // Don't close dialog on error
    } finally {
      setIsSaving(false);
    }
  };

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
              extensions={[
                javascript({ typescript: true }),
                typeScriptLinter,
                typeScriptAutocomplete,
              ]}
              theme={vscodeDark}
              onChange={(value) => {
                console.log('CodeMirror onChange called, new value length:', value.length);
                setTypes(value);
              }}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                lintKeymap: true,
              }}
            />
          </div>
          <div className="mt-3 p-3 bg-muted/50 rounded-md border space-y-2">
            <p className="text-xs text-muted-foreground">
              <strong>💡 Tip:</strong> These type definitions will be prepended to all code nodes during execution.
              Use type assertions (e.g., <code className="px-1 py-0.5 bg-background rounded">as User</code>) or 
              explicit types (e.g., <code className="px-1 py-0.5 bg-background rounded">const user: User = ...</code>) 
              in your code nodes.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>⌨️ Autocomplete:</strong> Press <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">Ctrl+Space</kbd> for suggestions.
              Errors are highlighted in red.
            </p>
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0 gap-2">
          <Button 
            variant="outline" 
            onClick={() => setTypes(defaultTemplate)}
            disabled={isSaving}
          >
            Load Template
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Type Definitions'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

