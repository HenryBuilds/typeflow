import * as ts from "typescript";
import { Diagnostic } from "@codemirror/lint";

/**
 * Create a TypeScript linter for code with type definitions
 */
export function createTypeScriptLinter(typeDefinitions?: string) {
  return (view: any): Diagnostic[] => {
    const code = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    try {
      // Extract import statements from user code
      const importRegex = /^import\s+.+\s+from\s+['"].+['"];?\s*$/gm;
      const imports = code.match(importRegex) || [];
      const codeWithoutImports = code.replace(importRegex, '').trim();

      // Add global require declaration
      const requireDeclaration = `
declare function require(moduleName: string): any;
`;
      
      // Combine imports, type definitions and code for full type checking
      // Keep imports at top level to avoid "import must be at top level" errors
      const fullCode = typeDefinitions 
        ? `${requireDeclaration}\n${imports.join('\n')}\n${typeDefinitions}\n\n${codeWithoutImports}`
        : `${requireDeclaration}\n${imports.join('\n')}\n\n${codeWithoutImports}`;

      // Create TypeScript program
      const sourceFile = ts.createSourceFile(
        "temp.ts",
        fullCode,
        ts.ScriptTarget.Latest,
        true
      );

      // Get syntactic diagnostics (syntax errors)
      const syntacticDiagnostics = (sourceFile as any).parseDiagnostics || [];

      // Get semantic diagnostics (type errors)
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022, // ES2022 supports top-level await
        module: ts.ModuleKind.ES2022, // ES2022 module system
        strict: false, // Be less strict to avoid too many errors
        noImplicitAny: false,
        strictNullChecks: false,
        skipLibCheck: true,
        lib: ["lib.es2022.d.ts"], // Use ES2022 lib
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        noResolve: true, // Don't try to resolve imports
      };

      // Create a simple type checker
      const compilerHost: ts.CompilerHost = {
        getSourceFile: (fileName) => {
          if (fileName === "temp.ts") {
            return sourceFile;
          }
          return undefined;
        },
        writeFile: () => {},
        getCurrentDirectory: () => "/",
        getDirectories: () => [],
        fileExists: (fileName) => fileName === "temp.ts",
        readFile: (fileName) => (fileName === "temp.ts" ? fullCode : undefined),
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
        getDefaultLibFileName: () => "lib.d.ts",
      };

      const program = ts.createProgram(["temp.ts"], compilerOptions, compilerHost);
      const semanticDiagnostics = program.getSemanticDiagnostics(sourceFile);

      // Combine all diagnostics
      const allDiagnostics = [...syntacticDiagnostics, ...semanticDiagnostics];

      // Convert TypeScript diagnostics to CodeMirror diagnostics
      // Calculate offsets for imports and type definitions
      const requireDeclLength = requireDeclaration.length;
      const importsText = imports.join('\n');
      const importsLength = importsText.length + (importsText ? 1 : 0); // +1 for newline
      const typeDefLength = typeDefinitions ? typeDefinitions.length + 2 : 0; // +2 for "\n\n"
      const totalOffset = requireDeclLength + importsLength + typeDefLength;

      allDiagnostics.forEach((diag) => {
        if (diag.file && diag.start !== undefined) {
          let start = diag.start;
          let end = diag.start + (diag.length || 1);

          // Check if the error is in the header section (require decl, imports, or type definitions)
          if (start < totalOffset) {
            // Check if error is in the imports section (we should map it back)
            if (start >= requireDeclLength && start < requireDeclLength + importsLength && imports.length > 0) {
              // Error is in imports - need to map back to original code position
              const importsStartInOriginal = code.indexOf(imports[0]);
              if (importsStartInOriginal >= 0) {
                const offsetInImports = start - requireDeclLength;
                start = importsStartInOriginal + offsetInImports;
                end = start + (diag.length || 1);
                
                // Make sure positions are within bounds
                if (start < 0 || start >= code.length) {
                  return;
                }
                end = Math.min(Math.max(end, start + 1), code.length);
              } else {
                return; // Skip if we can't find the import in original code
              }
            } else {
              return; // Skip errors in require declaration or type definitions
            }
          } else {
            // Subtract the total offset to get position in original code (without imports)
            start = start - totalOffset;
            end = end - totalOffset;
            
            // Now we need to add back the import lines in the original code
            // Count how many import lines there are to adjust the position
            const importLinesInOriginal = imports.length > 0 ? code.substring(0, code.indexOf(codeWithoutImports)).split('\n').length - 1 : 0;
            const importCharsInOriginal = imports.length > 0 ? code.indexOf(codeWithoutImports) : 0;
            
            start = start + importCharsInOriginal;
            end = end + importCharsInOriginal;
            
            // Make sure positions are within bounds
            if (start < 0 || start >= code.length) {
              return;
            }
            
            // Clamp end to code length
            end = Math.min(Math.max(end, start + 1), code.length);
          }

          if (start >= end || start < 0) {
            return;
          }

          const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
          
          // Skip module-related errors and runtime wrapper errors - these are expected
          const skipErrorPatterns = [
            "Cannot find module",
            "Cannot find name 'require'",
            "has no exported member",
            "is not a module",
            "Cannot redeclare",
            "Duplicate identifier",
            "Module",
            "import",
            "Top-level 'await'", // Code is wrapped in async function at runtime
            "'await' expressions are only allowed", // Top-level await is allowed in wrapped code
            "'return' statement can only be used", // Return is allowed - code is in a function at runtime
            "A 'return' statement can only be used", // Same as above
          ];
          
          if (skipErrorPatterns.some(pattern => message.includes(pattern))) {
            return;
          }
          
          // Determine severity
          let severity: "error" | "warning" | "info" = "error";
          if (diag.category === ts.DiagnosticCategory.Warning) {
            severity = "warning";
          } else if (diag.category === ts.DiagnosticCategory.Message) {
            severity = "info";
          }

          diagnostics.push({
            from: start,
            to: end,
            severity,
            message,
          });
        }
      });
    } catch (error) {
      console.error("TypeScript linting error:", error);
    }

    return diagnostics;
  };
}

/**
 * Create a TypeScript linter specifically for type definitions
 */
export function createTypeDefinitionsLinter() {
  return (view: any): Diagnostic[] => {
    const code = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    try {
      // Create TypeScript source file
      const sourceFile = ts.createSourceFile(
        "types.d.ts",
        code,
        ts.ScriptTarget.Latest,
        true
      );

      // Get syntactic diagnostics
      const syntacticDiagnostics = (sourceFile as any).parseDiagnostics || [];

      // Get semantic diagnostics
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        strict: false,
        noImplicitAny: false,
        skipLibCheck: true,
      };

      const compilerHost: ts.CompilerHost = {
        getSourceFile: (fileName) => {
          if (fileName === "types.d.ts") {
            return sourceFile;
          }
          return undefined;
        },
        writeFile: () => {},
        getCurrentDirectory: () => "/",
        getDirectories: () => [],
        fileExists: (fileName) => fileName === "types.d.ts",
        readFile: (fileName) => (fileName === "types.d.ts" ? code : undefined),
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
        getDefaultLibFileName: () => "lib.d.ts",
      };

      const program = ts.createProgram(["types.d.ts"], compilerOptions, compilerHost);
      const semanticDiagnostics = program.getSemanticDiagnostics(sourceFile);

      // Combine diagnostics
      const allDiagnostics = [...syntacticDiagnostics, ...semanticDiagnostics];

      // Convert to CodeMirror format
      allDiagnostics.forEach((diag) => {
        if (diag.file && diag.start !== undefined) {
          const start = diag.start;
          const length = diag.length || 1;
          const end = Math.min(start + length, code.length);

          const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
          
          // Skip module-related errors in type definitions too
          const moduleErrorPatterns = [
            "Cannot find module",
            "has no exported member",
            "is not a module",
            "Module",
            "import",
          ];
          
          if (moduleErrorPatterns.some(pattern => message.includes(pattern))) {
            return;
          }
          
          let severity: "error" | "warning" | "info" = "error";
          if (diag.category === ts.DiagnosticCategory.Warning) {
            severity = "warning";
          } else if (diag.category === ts.DiagnosticCategory.Message) {
            severity = "info";
          }

          diagnostics.push({
            from: start,
            to: end,
            severity,
            message,
          });
        }
      });
    } catch (error) {
      console.error("TypeScript linting error:", error);
    }

    return diagnostics;
  };
}

/**
 * TypeScript keywords and common types for autocomplete
 */
export const typescriptKeywords = [
  // Declaration keywords
  { label: 'interface', type: 'keyword', info: 'Define an interface' },
  { label: 'type', type: 'keyword', info: 'Define a type alias' },
  { label: 'enum', type: 'keyword', info: 'Define an enumeration' },
  { label: 'class', type: 'keyword', info: 'Define a class' },
  { label: 'namespace', type: 'keyword', info: 'Define a namespace' },
  
  // Modifiers
  { label: 'export', type: 'keyword', info: 'Export declaration' },
  { label: 'readonly', type: 'keyword', info: 'Readonly property' },
  { label: 'private', type: 'keyword', info: 'Private member' },
  { label: 'public', type: 'keyword', info: 'Public member' },
  { label: 'protected', type: 'keyword', info: 'Protected member' },
  { label: 'static', type: 'keyword', info: 'Static member' },
  { label: 'abstract', type: 'keyword', info: 'Abstract class/member' },
  
  // Type keywords
  { label: 'extends', type: 'keyword', info: 'Extend interface/type' },
  { label: 'implements', type: 'keyword', info: 'Implement interface' },
  { label: 'keyof', type: 'keyword', info: 'Get keys of type' },
  { label: 'typeof', type: 'keyword', info: 'Get type of value' },
  { label: 'infer', type: 'keyword', info: 'Infer type in conditional' },
  
  // Primitive types
  { label: 'string', type: 'type', info: 'String type' },
  { label: 'number', type: 'type', info: 'Number type' },
  { label: 'boolean', type: 'type', info: 'Boolean type' },
  { label: 'null', type: 'type', info: 'Null type' },
  { label: 'undefined', type: 'type', info: 'Undefined type' },
  { label: 'any', type: 'type', info: 'Any type' },
  { label: 'unknown', type: 'type', info: 'Unknown type (safer than any)' },
  { label: 'void', type: 'type', info: 'Void type' },
  { label: 'never', type: 'type', info: 'Never type' },
  { label: 'object', type: 'type', info: 'Object type' },
  { label: 'symbol', type: 'type', info: 'Symbol type' },
  { label: 'bigint', type: 'type', info: 'BigInt type' },
  
  // Utility types
  { label: 'Partial', type: 'type', info: 'Partial<T> - Make all properties optional' },
  { label: 'Required', type: 'type', info: 'Required<T> - Make all properties required' },
  { label: 'Readonly', type: 'type', info: 'Readonly<T> - Make all properties readonly' },
  { label: 'Record', type: 'type', info: 'Record<K, V> - Object with keys K and values V' },
  { label: 'Pick', type: 'type', info: 'Pick<T, K> - Pick properties K from T' },
  { label: 'Omit', type: 'type', info: 'Omit<T, K> - Omit properties K from T' },
  { label: 'Exclude', type: 'type', info: 'Exclude<T, U> - Exclude U from T' },
  { label: 'Extract', type: 'type', info: 'Extract<T, U> - Extract U from T' },
  { label: 'NonNullable', type: 'type', info: 'NonNullable<T> - Exclude null and undefined' },
  { label: 'ReturnType', type: 'type', info: 'ReturnType<F> - Get return type of function' },
  { label: 'Parameters', type: 'type', info: 'Parameters<F> - Get parameters of function' },
  { label: 'ConstructorParameters', type: 'type', info: 'ConstructorParameters<C> - Get constructor parameters' },
  { label: 'InstanceType', type: 'type', info: 'InstanceType<C> - Get instance type of constructor' },
  
  // Built-in types
  { label: 'Array', type: 'type', info: 'Array<T> - Array type' },
  { label: 'Promise', type: 'type', info: 'Promise<T> - Promise type' },
  { label: 'Map', type: 'type', info: 'Map<K, V> - Map type' },
  { label: 'Set', type: 'type', info: 'Set<T> - Set type' },
  { label: 'Date', type: 'type', info: 'Date type' },
  { label: 'Error', type: 'type', info: 'Error type' },
  { label: 'RegExp', type: 'type', info: 'Regular expression type' },
];

/**
 * Parse type definitions to extract custom type names
 */
export function parseTypeDefinitions(typeDefinitions: string) {
  const types: Array<{ label: string; type: string; info: string }> = [];
  
  // Extract interface names
  const interfaceRegex = /interface\s+([A-Z]\w*)/g;
  let match;
  while ((match = interfaceRegex.exec(typeDefinitions)) !== null) {
    types.push({
      label: match[1],
      type: 'interface',
      info: `Interface ${match[1]} (custom)`,
    });
  }
  
  // Extract type names
  const typeRegex = /type\s+([A-Z]\w*)\s*=/g;
  while ((match = typeRegex.exec(typeDefinitions)) !== null) {
    types.push({
      label: match[1],
      type: 'type',
      info: `Type ${match[1]} (custom)`,
    });
  }
  
  // Extract enum names
  const enumRegex = /enum\s+([A-Z]\w*)/g;
  while ((match = enumRegex.exec(typeDefinitions)) !== null) {
    types.push({
      label: match[1],
      type: 'enum',
      info: `Enum ${match[1]} (custom)`,
    });
  }
  
  // Extract class names
  const classRegex = /class\s+([A-Z]\w*)/g;
  while ((match = classRegex.exec(typeDefinitions)) !== null) {
    types.push({
      label: match[1],
      type: 'class',
      info: `Class ${match[1]} (custom)`,
    });
  }
  
  return types;
}

