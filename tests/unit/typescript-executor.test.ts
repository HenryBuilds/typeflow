import { describe, it, expect } from 'vitest'
import * as ts from 'typescript'

// Test TypeScript execution and linting logic
describe('TypeScript Executor - Core Logic', () => {
  describe('TypeScript Transpilation', () => {
    it('should transpile simple TypeScript to JavaScript', () => {
      const tsCode = `const x: number = 5;`
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      })

      expect(result.outputText).toBeDefined()
      expect(result.outputText).toContain('x = 5')
    })

    it('should transpile arrow functions', () => {
      const tsCode = `const add = (a: number, b: number): number => a + b;`
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      })

      expect(result.outputText).toContain('add')
      expect(result.outputText).not.toContain(': number')
    })

    it('should transpile async/await', () => {
      const tsCode = `async function fetchData(): Promise<string> { return await Promise.resolve('data'); }`
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      })

      expect(result.outputText).toContain('async')
      expect(result.outputText).toContain('await')
    })

    it('should transpile interfaces (remove them)', () => {
      const tsCode = `interface User { name: string; } const user: User = { name: 'John' };`
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      })

      expect(result.outputText).not.toContain('interface')
      expect(result.outputText).toContain('user')
    })

    it('should transpile type aliases (remove them)', () => {
      const tsCode = `type ID = string | number; const id: ID = 123;`
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      })

      expect(result.outputText).not.toContain('type ID')
      expect(result.outputText).toContain('id')
    })

    it('should transpile generics', () => {
      const tsCode = `function identity<T>(arg: T): T { return arg; }`
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      })

      expect(result.outputText).toContain('function identity')
      expect(result.outputText).not.toContain('<T>')
    })

    it('should transpile classes with types', () => {
      const tsCode = `
        class Person {
          name: string;
          constructor(name: string) {
            this.name = name;
          }
          greet(): string {
            return 'Hello, ' + this.name;
          }
        }
      `
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
        },
      })

      expect(result.outputText).toContain('class Person')
      expect(result.outputText).toContain('constructor')
      expect(result.outputText).toContain('greet')
    })
  })

  describe('Import Statement Extraction', () => {
    const extractImports = (code: string): string[] => {
      const importRegex = /^import\s+.+\s+from\s+['""].+['"];?\s*$/gm
      return code.match(importRegex) || []
    }

    it('should extract default imports', () => {
      const code = `import lodash from 'lodash';\nconst x = 1;`
      const imports = extractImports(code)
      expect(imports).toHaveLength(1)
      expect(imports[0]).toContain('lodash')
    })

    it('should extract named imports', () => {
      const code = `import { map, filter } from 'lodash';\nconst x = 1;`
      const imports = extractImports(code)
      expect(imports).toHaveLength(1)
      expect(imports[0]).toContain('map')
    })

    it('should extract namespace imports', () => {
      const code = `import * as _ from 'lodash';\nconst x = 1;`
      const imports = extractImports(code)
      expect(imports).toHaveLength(1)
      expect(imports[0]).toContain('* as _')
    })

    it('should extract multiple imports', () => {
      const code = `import lodash from 'lodash';\nimport axios from 'axios';\nconst x = 1;`
      const imports = extractImports(code)
      expect(imports).toHaveLength(2)
    })

    it('should handle code without imports', () => {
      const code = `const x = 1; const y = 2;`
      const imports = extractImports(code)
      expect(imports).toHaveLength(0)
    })
  })

  describe('Import to Require Conversion', () => {
    const convertImportToRequire = (importStmt: string): string => {
      // Default import: import x from 'y'
      const defaultMatch = importStmt.match(/import\s+(\w+)\s+from\s+['"](.+)['"]/)
      if (defaultMatch && !importStmt.includes('{')) {
        return `const ${defaultMatch[1]} = require('${defaultMatch[2]}');`
      }

      // Named import: import { x } from 'y'
      const namedMatch = importStmt.match(/import\s+\{([^}]+)\}\s+from\s+['"](.+)['"]/)
      if (namedMatch) {
        const names = namedMatch[1].trim()
        const module = namedMatch[2]
        return `const { ${names} } = require('${module}');`
      }

      // Namespace import: import * as x from 'y'
      const namespaceMatch = importStmt.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"](.+)['"]/)
      if (namespaceMatch) {
        return `const ${namespaceMatch[1]} = require('${namespaceMatch[2]}');`
      }

      return importStmt
    }

    it('should convert default import to require', () => {
      const result = convertImportToRequire(`import lodash from 'lodash';`)
      expect(result).toBe(`const lodash = require('lodash');`)
    })

    it('should convert named import to require', () => {
      const result = convertImportToRequire(`import { map, filter } from 'lodash';`)
      expect(result).toBe(`const { map, filter } = require('lodash');`)
    })

    it('should convert namespace import to require', () => {
      const result = convertImportToRequire(`import * as _ from 'lodash';`)
      expect(result).toBe(`const _ = require('lodash');`)
    })
  })

  describe('Type Checking', () => {
    const getTypeErrors = (code: string): string[] => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        code,
        ts.ScriptTarget.ES2020,
        true
      )

      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: false,
        noImplicitAny: false,
        skipLibCheck: true,
        noLib: true,
        noResolve: true,
      }

      const host: ts.CompilerHost = {
        getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
        writeFile: () => {},
        getCurrentDirectory: () => '/',
        getDirectories: () => [],
        fileExists: (fileName) => fileName === 'test.ts',
        readFile: (fileName) => fileName === 'test.ts' ? code : undefined,
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
        getDefaultLibFileName: () => 'lib.d.ts',
      }

      const program = ts.createProgram(['test.ts'], compilerOptions, host)
      const diagnostics = program.getSemanticDiagnostics(sourceFile)

      return diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
    }

    it('should detect syntax errors', () => {
      const code = `const x: number = ;` // Missing value
      const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2020, true)
      const parseDiagnostics = (sourceFile as any).parseDiagnostics || []
      expect(parseDiagnostics.length).toBeGreaterThan(0)
    })

    it('should handle valid code without errors', () => {
      const code = `const x = 5;`
      const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2020, true)
      const parseDiagnostics = (sourceFile as any).parseDiagnostics || []
      expect(parseDiagnostics).toHaveLength(0)
    })
  })

  describe('parseTypeDefinitions', () => {
    const parseTypeDefinitions = (typeDefinitions: string) => {
      const types: Array<{ label: string; type: string; info: string }> = []

      // Extract interface names
      const interfaceRegex = /interface\s+([A-Z]\w*)/g
      let match
      while ((match = interfaceRegex.exec(typeDefinitions)) !== null) {
        types.push({
          label: match[1],
          type: 'interface',
          info: `Interface ${match[1]} (custom)`,
        })
      }

      // Extract type names
      const typeRegex = /type\s+([A-Z]\w*)\s*=/g
      while ((match = typeRegex.exec(typeDefinitions)) !== null) {
        types.push({
          label: match[1],
          type: 'type',
          info: `Type ${match[1]} (custom)`,
        })
      }

      // Extract enum names
      const enumRegex = /enum\s+([A-Z]\w*)/g
      while ((match = enumRegex.exec(typeDefinitions)) !== null) {
        types.push({
          label: match[1],
          type: 'enum',
          info: `Enum ${match[1]} (custom)`,
        })
      }

      // Extract class names
      const classRegex = /class\s+([A-Z]\w*)/g
      while ((match = classRegex.exec(typeDefinitions)) !== null) {
        types.push({
          label: match[1],
          type: 'class',
          info: `Class ${match[1]} (custom)`,
        })
      }

      return types
    }

    it('should extract interface names', () => {
      const typeDefs = `interface User { name: string; } interface Product { id: number; }`
      const result = parseTypeDefinitions(typeDefs)

      expect(result).toHaveLength(2)
      expect(result[0].label).toBe('User')
      expect(result[0].type).toBe('interface')
      expect(result[1].label).toBe('Product')
    })

    it('should extract type alias names', () => {
      const typeDefs = `type ID = string; type Status = 'active' | 'inactive';`
      const result = parseTypeDefinitions(typeDefs)

      expect(result).toHaveLength(2)
      expect(result[0].label).toBe('ID')
      expect(result[0].type).toBe('type')
    })

    it('should extract enum names', () => {
      const typeDefs = `enum Color { Red, Green, Blue } enum Size { Small, Medium, Large }`
      const result = parseTypeDefinitions(typeDefs)

      expect(result).toHaveLength(2)
      expect(result[0].label).toBe('Color')
      expect(result[0].type).toBe('enum')
    })

    it('should extract class names', () => {
      const typeDefs = `class UserService { } class ProductRepository { }`
      const result = parseTypeDefinitions(typeDefs)

      expect(result).toHaveLength(2)
      expect(result[0].label).toBe('UserService')
      expect(result[0].type).toBe('class')
    })

    it('should extract mixed type definitions', () => {
      const typeDefs = `
        interface User { name: string; }
        type ID = string;
        enum Status { Active, Inactive }
        class Service { }
      `
      const result = parseTypeDefinitions(typeDefs)

      expect(result).toHaveLength(4)
      const labels = result.map(r => r.label)
      expect(labels).toContain('User')
      expect(labels).toContain('ID')
      expect(labels).toContain('Status')
      expect(labels).toContain('Service')
    })

    it('should handle empty type definitions', () => {
      const result = parseTypeDefinitions('')
      expect(result).toHaveLength(0)
    })
  })

  describe('Code Execution Wrapper', () => {
    it('should wrap code in async function', async () => {
      const code = `return 1 + 2;`
      const wrappedCode = `
        return (async function() {
          ${code}
        })();
      `

      const fn = new Function(wrappedCode)
      const result = await fn()
      expect(result).toBe(3)
    })

    it('should execute code with input parameters', async () => {
      const $input = [{ json: { value: 10 } }]
      const code = `return $input[0].json.value * 2;`
      const wrappedCode = `
        return (async function($input) {
          ${code}
        })(arguments[0]);
      `

      const fn = new Function('$input', wrappedCode)
      const result = await fn($input)
      expect(result).toBe(20)
    })

    it('should handle async operations in code', async () => {
      const code = `
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        await delay(10);
        return 'done';
      `
      const wrappedCode = `
        return (async function() {
          ${code}
        })();
      `

      const fn = new Function(wrappedCode)
      const result = await fn()
      expect(result).toBe('done')
    })

    it('should handle array transformations', async () => {
      const $input = [
        { json: { value: 1 } },
        { json: { value: 2 } },
        { json: { value: 3 } },
      ]
      const code = `return $input.map(item => ({ json: { doubled: item.json.value * 2 } }));`
      const wrappedCode = `
        return (async function($input) {
          ${code}
        })(arguments[0]);
      `

      const fn = new Function('$input', wrappedCode)
      const result = await fn($input)
      expect(result).toHaveLength(3)
      expect(result[0].json.doubled).toBe(2)
      expect(result[1].json.doubled).toBe(4)
      expect(result[2].json.doubled).toBe(6)
    })

    it('should handle object spread and destructuring', async () => {
      const $json = { name: 'John', age: 30 }
      const code = `
        const { name, age } = $json;
        return { ...($json), fullName: name, isAdult: age >= 18 };
      `
      const wrappedCode = `
        return (async function($json) {
          ${code}
        })(arguments[0]);
      `

      const fn = new Function('$json', wrappedCode)
      const result = await fn($json)
      expect(result.name).toBe('John')
      expect(result.fullName).toBe('John')
      expect(result.isAdult).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should catch runtime errors', async () => {
      const code = `throw new Error('Test error');`
      const wrappedCode = `
        return (async function() {
          ${code}
        })();
      `

      const fn = new Function(wrappedCode)
      await expect(fn()).rejects.toThrow('Test error')
    })

    it('should handle undefined property access gracefully', async () => {
      const $json = {}
      const code = `return $json.nested?.property ?? 'default';`
      const wrappedCode = `
        return (async function($json) {
          ${code}
        })(arguments[0]);
      `

      const fn = new Function('$json', wrappedCode)
      const result = await fn($json)
      expect(result).toBe('default')
    })
  })

  describe('Function Extraction', () => {
    const extractFunctionNames = (code: string): string[] => {
      const functions: string[] = []

      // Match function declarations
      const functionMatches = code.matchAll(/function\s+([a-zA-Z_$][\w$]*)\s*\(/g)
      for (const match of functionMatches) {
        functions.push(match[1])
      }

      // Match arrow functions
      const arrowMatches = code.matchAll(/const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g)
      for (const match of arrowMatches) {
        functions.push(match[1])
      }

      return functions
    }

    it('should extract function declaration names', () => {
      const code = `function add(a, b) { return a + b; } function multiply(a, b) { return a * b; }`
      const result = extractFunctionNames(code)
      expect(result).toContain('add')
      expect(result).toContain('multiply')
    })

    it('should extract arrow function names', () => {
      const code = `const add = (a, b) => a + b; const subtract = (a, b) => a - b;`
      const result = extractFunctionNames(code)
      expect(result).toContain('add')
      expect(result).toContain('subtract')
    })

    it('should extract async arrow function names', () => {
      const code = `const fetchData = async () => { return await fetch('/api'); }`
      const result = extractFunctionNames(code)
      expect(result).toContain('fetchData')
    })

    it('should handle mixed function types', () => {
      const code = `
        function regularFn() { }
        const arrowFn = () => { }
        const asyncArrowFn = async () => { }
      `
      const result = extractFunctionNames(code)
      expect(result).toHaveLength(3)
      expect(result).toContain('regularFn')
      expect(result).toContain('arrowFn')
      expect(result).toContain('asyncArrowFn')
    })
  })
})
