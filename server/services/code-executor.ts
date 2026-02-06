/**
 * Code Node Executor
 * Handles execution of Code and Utilities nodes
 */

import * as ts from "typescript";
import * as Module from "module";
import * as path from "path";
import { nodes } from "@/db/schema";
import { packageManager } from "./package-manager";
import { credentialService } from "./credential-service";
import { createLogger } from "@/lib/logger";
import type { ExecutionItem } from "@/types/execution";

const log = createLogger('CodeExecutor');

/**
 * Extract function names from TypeScript/JavaScript code
 */
export function extractFunctionNames(code: string): string[] {
  const functionNames: string[] = [];
  
  // Match function declarations: function name(...) { }
  const funcDeclRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  let match;
  while ((match = funcDeclRegex.exec(code)) !== null) {
    functionNames.push(match[1]);
  }
  
  // Match arrow functions and function expressions: const name = (...) => { } or const name = function(...) { }
  const arrowFuncRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g;
  while ((match = arrowFuncRegex.exec(code)) !== null) {
    functionNames.push(match[1]);
  }
  
  // Match exported function declarations: export function name(...) or export const name = ...
  const exportFuncRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = exportFuncRegex.exec(code)) !== null) {
    if (!functionNames.includes(match[1])) {
      functionNames.push(match[1]);
    }
  }
  
  const exportConstRegex = /export\s+(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
  while ((match = exportConstRegex.exec(code)) !== null) {
    if (!functionNames.includes(match[1])) {
      functionNames.push(match[1]);
    }
  }
  
  return functionNames;
}

/**
 * Execute utilities node - returns exported functions/objects
 */
export async function executeUtilitiesNode(
  node: typeof nodes.$inferSelect,
  organizationId: string,
  typeDefinitions?: string
): Promise<Record<string, any>> {
  const code = (node.config as { code?: string })?.code;

  if (!code || code.trim() === "") {
    return {}; // No functions if no code
  }

  try {
    // Extract import statements
    const importRegex = /^import\s+.+\s+from\s+['"].+['"];?\s*$/gm;
    const imports = code.match(importRegex) || [];
    const codeWithoutImports = code.replace(importRegex, '').trim();

    // Convert imports to require statements
    const requireStatements = imports.map(importStmt => {
      const defaultMatch = importStmt.match(/import\s+(\w+)\s+from\s+['"](.+)['"]/);
      if (defaultMatch && !importStmt.includes('{')) {
        return `const ${defaultMatch[1]} = require('${defaultMatch[2]}');`;
      }
      
      const namedMatch = importStmt.match(/import\s+\{([^}]+)\}\s+from\s+['"](.+)['"]/);
      if (namedMatch) {
        const names = namedMatch[1].trim();
        const module = namedMatch[2];
        return `const { ${names} } = require('${module}');`;
      }
      
      const namespaceMatch = importStmt.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"](.+)['"]/);
      if (namespaceMatch) {
        return `const ${namespaceMatch[1]} = require('${namespaceMatch[2]}');`;
      }
      
      return importStmt;
    }).join('\n');

    // Transpile TypeScript to JavaScript
    const transpileResult = ts.transpileModule(codeWithoutImports, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    });
    const jsCode = transpileResult.outputText.trim();

    // Execute the transpiled code with proper CommonJS module support
    const wrappedCode = `
      return (async function(require, module, exports) {
        ${requireStatements}
        
        // Execute the transpiled code
        ${jsCode}
        
        // Return module.exports (which might have been reassigned)
        return module.exports;
      })(require, module, exports);
    `;

    // Execute the code
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const executableFunction = new AsyncFunction('require', 'module', 'exports', wrappedCode);
    
    // Create custom require function
    let customRequire: NodeRequire = require;
    try {
      const orgPackagesPath = packageManager.getNodeModulesPath(organizationId);
      const orgPackageJsonPath = path.join(orgPackagesPath, "..", "package.json");
      customRequire = Module.createRequire(orgPackageJsonPath);
    } catch {
      customRequire = require;
    }
    
    // Create module and exports objects (CommonJS pattern)
    const exportsObj: any = {};
    const moduleObj = { exports: exportsObj };

    // Execute and get exports
    const result = await executableFunction(customRequire, moduleObj, exportsObj);
    
    // Return the result (module.exports after execution)
    return result && typeof result === 'object' ? result : {};
  } catch (error: any) {
    throw new Error(`Utilities execution failed: ${error.message}`);
  }
}

/**
 * Execute code node - runs user TypeScript/JavaScript code
 */
export async function executeCodeNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[],
  predecessorOutputs: Map<string, { nodeLabel: string; output: ExecutionItem[] }>,
  organizationId: string,
  typeDefinitions?: string,
  utilities?: Map<string, { label: string; exports: Record<string, any>; code: string }>
): Promise<ExecutionItem[]> {
  const code = (node.config as { code?: string })?.code;

  if (!code || code.trim() === "") {
    return inputItems; // Pass through if no code
  }

  try {
    // Extract import statements from user code
    const importRegex = /^import\s+.+\s+from\s+['"].+['"];?\s*$/gm;
    const imports = code.match(importRegex) || [];
    const codeWithoutImports = code.replace(importRegex, '').trim();

    // Convert imports to require statements for runtime
    const requireStatements = imports.map(importStmt => {
      // Handle: import defaultExport from "module"
      const defaultMatch = importStmt.match(/import\s+(\w+)\s+from\s+['"](.+)['"]/);
      if (defaultMatch && !importStmt.includes('{')) {
        return `const ${defaultMatch[1]} = require('${defaultMatch[2]}');`;
      }
      
      // Handle: import { named } from "module"
      const namedMatch = importStmt.match(/import\s+\{([^}]+)\}\s+from\s+['"](.+)['"]/);
      if (namedMatch) {
        const names = namedMatch[1].trim();
        const module = namedMatch[2];
        return `const { ${names} } = require('${module}');`;
      }
      
      // Handle: import * as name from "module"
      const namespaceMatch = importStmt.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"](.+)['"]/);
      if (namespaceMatch) {
        return `const ${namespaceMatch[1]} = require('${namespaceMatch[2]}');`;
      }
      
      return importStmt;
    }).join('\n');

    // Prepend type definitions to code if provided
    const fullCode = typeDefinitions 
      ? `${typeDefinitions}\n\n${code}`
      : code;

    // Add global declarations for runtime functions
    let predecessorDeclarations = '';
    predecessorOutputs.forEach((data, nodeId) => {
      const sanitizedLabel = data.nodeLabel.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
      const varName = `$${sanitizedLabel}`;
      predecessorDeclarations += `declare const ${varName}: { json: any; input: any[] };\n`;
    });

    // Generate utilities declarations
    let utilitiesDeclarations = '';
    if (utilities) {
      utilities.forEach((utilityData, utilityNodeId) => {
        const sanitizedLabel = utilityData.label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
        const varName = `$${sanitizedLabel}`;
        
        // Try to get function names from exports first
        let functionNames = Object.keys(utilityData.exports);
        
        // If exports is empty (during type-checking), extract from code
        if (functionNames.length === 0 && utilityData.code) {
          functionNames = extractFunctionNames(utilityData.code);
        }
        
        // Generate type declarations for each function
        const exportDeclarations = functionNames
          .map(fnName => `  ${fnName}: (...args: any[]) => any;`)
          .join('\n');
        
        utilitiesDeclarations += `declare const ${varName}: {\n${exportDeclarations}\n};\n`;
      });
    }

    const globalDeclarations = `
declare function require(moduleName: string): any;
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
declare const $input: any[];
declare const $json: any;
declare const $inputItem: any;
declare const $inputAll: any[];
declare const $credentials: Record<string, any>;
${predecessorDeclarations}
${utilitiesDeclarations}
`;

    // Wrap code in async function for type checking
    const wrappedCodeForTypeCheck = `
      ${globalDeclarations}
      ${typeDefinitions || ''}
      ${imports.join('\n')}
      
      async function __userCode__() {
        ${codeWithoutImports}
      }
    `;

    // Create a virtual source file for type checking
    const fileName = "code.ts";
    const sourceFile = ts.createSourceFile(
      fileName,
      wrappedCodeForTypeCheck,
      ts.ScriptTarget.ES2020,
      true
    );

    // Create compiler options
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      lib: ['lib.es2020.d.ts'],
      strict: false,
      noImplicitAny: false,
      strictNullChecks: false,
      strictFunctionTypes: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
      skipLibCheck: true,
      types: [],
      noResolve: true,
    };

    // Create a virtual compiler host
    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile;
    
    host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (name === fileName) {
        return sourceFile;
      }
      return originalGetSourceFile.call(host, name, languageVersion, onError, shouldCreateNewSourceFile);
    };

    // Create program for type checking
    const program = ts.createProgram([fileName], compilerOptions, host);
    
    // Get diagnostics (type errors)
    const diagnostics = ts.getPreEmitDiagnostics(program);

    // Check for TypeScript errors
    if (diagnostics.length > 0) {
      const skipErrorPatterns = [
        "Cannot find module",
        "Cannot find name 'require'",
        "has no exported member",
        "is not a module",
        "Cannot redeclare",
        "Duplicate identifier",
        // ESM module system errors handled at runtime
        "An import declaration can only be used",
        "import declaration can only be used at the top level",
        "'import' and 'export' may appear only",
        "A default export must be at the top level",
        "default export must be at the top level",
        "cannot have multiple default exports",
        "Multiple exports of name",
        "export declaration can only be used",
        // Await/return wrapped in function
        "Top-level 'await'",
        "'await' expressions are only allowed",
        "'return' statement can only be used",
        "A 'return' statement can only be used",
      ];
      
      const errors = diagnostics
        .filter(d => d.category === ts.DiagnosticCategory.Error)
        .filter(diagnostic => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          return !skipErrorPatterns.some(pattern => message.includes(pattern));
        })
        .map(diagnostic => {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const typeDefLines = typeDefinitions ? typeDefinitions.split('\n').length : 0;
            const importLines = imports.length;
            const wrapperLines = 3;
            const adjustedLine = Math.max(1, line + 1 - typeDefLines - importLines - wrapperLines);
            return `Line ${adjustedLine}, Col ${character + 1}: ${message}`;
          }
          return message;
        });

      if (errors.length > 0) {
        throw new Error(`TypeScript Validation Error:\n\n${errors.join('\n\n')}`);
      }
    }

    // Transpile to JavaScript
    const transpileResult = ts.transpileModule(codeWithoutImports, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    });
    const jsCodeWithoutRequires = transpileResult.outputText.trim();

    // Load credentials for this organization
    const credentials = await credentialService.getCredentials(organizationId);

    // Create a safe execution context with timeout
    const executeWithTimeout = async (
      code: string,
      timeoutMs: number = 5000
    ): Promise<ExecutionItem[]> => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Execution timeout"));
        }, timeoutMs);

        try {
          // Build safe console
          const safeConsole = {
            log: (...args: unknown[]) => {
              log.debug({ args }, 'Node console.log');
            },
            error: (...args: unknown[]) => {
              log.error({ args }, 'Node console.error');
            },
            warn: (...args: unknown[]) => {
              log.warn({ args }, 'Node console.warn');
            },
          };

          // Create custom require function
          const orgPackagesPath = packageManager.getNodeModulesPath(organizationId);
          const orgPackageJsonPath = path.join(path.dirname(orgPackagesPath), 'package.json');
          let customRequire: (moduleName: string) => any;
          
          try {
            customRequire = Module.createRequire(orgPackageJsonPath);
          } catch {
            customRequire = require;
          }

          // Build parameter names and values
          const paramNames: string[] = ["$input", "console", "require", "$credentials"];
          const paramValues: unknown[] = [inputItems, safeConsole, customRequire, credentials];
          
          // Build convenience variables code
          let convenienceVarsCode = `
              const $json = $input && $input.length > 0 ? $input[0].json : {};
              const $inputItem = $json;
              const $inputAll = $input || [];
          `;
          
          // Add variables for all predecessor nodes
          predecessorOutputs.forEach((data, nodeId) => {
            const sanitizedLabel = data.nodeLabel.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
            const varName = `$${sanitizedLabel}`;
            
            const nodeData = {
              json: data.output && data.output.length > 0 ? data.output[0].json : {},
              input: data.output || [],
            };
            
            paramNames.push(varName);
            paramValues.push(nodeData);
          });
          
          // Add utilities as parameters
          if (utilities) {
            utilities.forEach((utilityData, utilityNodeId) => {
              const sanitizedLabel = utilityData.label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
              const varName = `$${sanitizedLabel}`;
              
              paramNames.push(varName);
              paramValues.push(utilityData.exports);
            });
          }
          
          const wrappedCode = `
            ${requireStatements}
            
            return (async function(${paramNames.join(", ")}) {
              ${convenienceVarsCode}
              
              ${jsCodeWithoutRequires}
            })(${paramNames.map((_, i) => `arguments[${i}]`).join(", ")});
          `;

          const fn = new Function(...paramNames, wrappedCode);

          Promise.resolve(fn(...paramValues))
            .then((result) => {
              clearTimeout(timeout);

              let outputItems: ExecutionItem[] = [];

              if (result === undefined) {
                outputItems = [{ json: { value: null } }];
              } else if (result === null) {
                outputItems = [{ json: { value: null } }];
              } else if (Array.isArray(result)) {
                if (result.length > 0 && result[0]?.json !== undefined) {
                  outputItems = result as ExecutionItem[];
                } else {
                  outputItems = result.map((item: unknown) => ({
                    json:
                      typeof item === "object" && item !== null
                        ? (item as Record<string, unknown>)
                        : { value: item },
                  }));
                }
              } else if (typeof result === "object") {
                outputItems = [{ json: result as Record<string, unknown> }];
              } else {
                outputItems = [{ json: { value: result } }];
              }

              resolve(outputItems);
            })
            .catch((error) => {
              clearTimeout(timeout);
              reject(error);
            });
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    };

    const result = await executeWithTimeout(jsCodeWithoutRequires, 5000);
    return result;
  } catch (error) {
    throw new Error(
      `Code execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
