/**
 * Node Loader Service
 * 
 * Scans and loads external node packages from the custom nodes directory.
 * Compatible with typeflow's package structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createRequire } from 'module';
import type {
  INodeType,
  ICredentialType,
  ILoadedNode,
  ILoadedCredential,
  INodePackageJson,
} from '@/types/workflow-types';
import { createLogger } from '@/lib/logger';

const log = createLogger('NodeLoader');

// Create a require function for ESM context
// We use a concrete path to avoid Turbopack static analysis issues
const esmRequire = createRequire(path.join(process.cwd(), 'package.json'));

// Wrapper function that loads modules dynamically
function dynamicRequire(modulePath: string): Record<string, unknown> {
  return esmRequire(modulePath) as Record<string, unknown>;
}

export class NodeLoader {
  private loadedNodes: Map<string, ILoadedNode> = new Map();
  private loadedCredentials: Map<string, ILoadedCredential> = new Map();
  private customNodesPath: string;
  private isLoaded = false;

  constructor(customNodesPath?: string) {
    // Default to ~/.typeflow/custom/node_modules
    this.customNodesPath = customNodesPath || path.join(
      os.homedir(),
      '.typeflow',
      'custom',
      'node_modules'
    );
  }

  /**
   * Initialize the loader and scan for external nodes
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    log.info({ path: this.customNodesPath }, 'Scanning for custom nodes');

    try {
      await this.ensureCustomNodesDirectory();
      await this.scanAndLoadPackages();
      
      // In development mode, also load the template package
      if (process.env.NODE_ENV === 'development') {
        await this.loadTemplatePackage();
      }
      
      this.isLoaded = true;
      log.info({ nodes: this.loadedNodes.size, credentials: this.loadedCredentials.size }, 'Custom nodes loaded');
    } catch (error) {
      log.error({ err: error }, 'Error initializing');
    }
  }

  /**
   * Load the template package from templates/typeflow-node-starter
   * This is for development/testing purposes
   */
  private async loadTemplatePackage(): Promise<void> {
    const templatePath = path.join(process.cwd(), 'templates', 'typeflow-node-starter');
    const distPath = path.join(templatePath, 'dist');
    
    // Check if dist exists (template needs to be built first)
    if (!fs.existsSync(distPath)) {
      log.debug('Template package not built. Run "npm run build" in templates/typeflow-node-starter to enable testing.');
      return;
    }
    
    const packageJsonPath = path.join(templatePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      log.debug('Template package.json not found');
      return;
    }
    
    try {
      const packageJson: INodePackageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );
      
      const nodeConfig = packageJson.typeflow || packageJson.typeflow;
      if (!nodeConfig) {
        log.debug('Template has no typeflow/typeflow configuration');
        return;
      }
      
      log.info('Loading template package for development...');
      
      // Load template nodes
      if (nodeConfig.nodes) {
        for (const nodePath of nodeConfig.nodes) {
          await this.loadNode(templatePath, nodePath, 'typeflow-node-starter');
        }
      }
      
      // Load template credentials
      if (nodeConfig.credentials) {
        for (const credPath of nodeConfig.credentials) {
          await this.loadCredential(templatePath, credPath, 'typeflow-node-starter');
        }
      }
      
      log.info('Template package loaded successfully');
    } catch (error) {
      log.error({ err: error }, 'Error loading template package');
    }
  }

  /**
   * Ensure the custom nodes directory exists
   */
  private async ensureCustomNodesDirectory(): Promise<void> {
    const baseDir = path.dirname(this.customNodesPath);
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      log.debug({ path: baseDir }, 'Created custom nodes directory');
      
      // Initialize package.json for npm link support
      const packageJsonPath = path.join(baseDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        fs.writeFileSync(packageJsonPath, JSON.stringify({
          name: 'typeflow-custom-nodes',
          version: '1.0.0',
          description: 'Custom nodes for Typeflow',
          private: true,
          dependencies: {}
        }, null, 2));
      }
    }

    if (!fs.existsSync(this.customNodesPath)) {
      fs.mkdirSync(this.customNodesPath, { recursive: true });
    }
  }

  /**
   * Scan node_modules for typeflow/typeflow node packages
   */
  private async scanAndLoadPackages(): Promise<void> {
    if (!fs.existsSync(this.customNodesPath)) {
      log.debug({ path: this.customNodesPath }, 'Custom nodes path does not exist');
      return;
    }

    const entries = fs.readdirSync(this.customNodesPath, { withFileTypes: true });
    log.debug({ count: entries.length }, 'Found entries in node_modules');

    for (const entry of entries) {
      log.trace({ name: entry.name, isDirectory: entry.isDirectory(), isSymbolicLink: entry.isSymbolicLink() }, 'Checking entry');
      
      // Skip files, but follow symlinks to check if they point to directories
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      
      // For symlinks, check if target is a directory
      if (entry.isSymbolicLink()) {
        const targetPath = path.join(this.customNodesPath, entry.name);
        try {
          const stat = fs.statSync(targetPath);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
      }
      
      log.debug({ package: entry.name }, 'Checking package');

      // Handle scoped packages (@org/package-name)
      if (entry.name.startsWith('@')) {
        const scopedPath = path.join(this.customNodesPath, entry.name);
        const scopedEntries = fs.readdirSync(scopedPath, { withFileTypes: true });
        
        for (const scopedEntry of scopedEntries) {
          if (scopedEntry.isDirectory()) {
            const fullPackageName = `${entry.name}/${scopedEntry.name}`;
            await this.loadPackage(path.join(scopedPath, scopedEntry.name), fullPackageName);
          }
        }
      } else {
        // Regular packages - look for typeflow-nodes-* or typeflow-nodes-* prefix
        if (entry.name.startsWith('typeflow-nodes-') || entry.name.startsWith('typeflow-nodes-')) {
          log.debug({ package: entry.name }, 'Package matches prefix');
          await this.loadPackage(path.join(this.customNodesPath, entry.name), entry.name);
        }
      }
    }
  }

  /**
   * Load a single node package
   */
  private async loadPackage(packagePath: string, packageName: string): Promise<void> {
    const packageJsonPath = path.join(packagePath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      log.warn({ path: packagePath }, 'No package.json found');
      return;
    }

    try {
      const packageJson: INodePackageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );

      // Check for typeflow or typeflow node definition (fallback to typeflow for compatibility)
      const nodeConfig = packageJson.typeflow || packageJson.typeflow;
      if (!nodeConfig) {
        log.warn({ package: packageName }, 'Package has no typeflow/typeflow configuration');
        return;
      }

      log.info({ package: packageName }, 'Loading package');

      // Load nodes
      if (nodeConfig.nodes) {
        for (const nodePath of nodeConfig.nodes) {
          await this.loadNode(packagePath, nodePath, packageName);
        }
      }

      // Load credentials
      if (nodeConfig.credentials) {
        for (const credPath of nodeConfig.credentials) {
          await this.loadCredential(packagePath, credPath, packageName);
        }
      }

    } catch (error) {
      log.error({ err: error, package: packageName }, 'Error loading package');
    }
  }

  /**
   * Load a single node from a package
   */
  private async loadNode(packagePath: string, relativeNodePath: string, packageName: string): Promise<void> {
    const fullPath = path.join(packagePath, relativeNodePath);

    if (!fs.existsSync(fullPath)) {
      log.warn({ path: fullPath }, 'Node file not found');
      return;
    }

    try {
      // Use dynamicRequire (from createRequire) to load external node modules
      const nodeModule = dynamicRequire(fullPath);
      
      // Find the exported class that implements INodeType
      for (const exportName of Object.keys(nodeModule)) {
        const ExportedClass = nodeModule[exportName];
        
        if (typeof ExportedClass === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const instance = new (ExportedClass as new () => INodeType)();
          
          // Verify it has the required description property
          if (instance.description && instance.description.name) {
            const nodeName = instance.description.name;
            
            this.loadedNodes.set(nodeName, {
              type: instance,
              sourcePath: fullPath,
              packageName,
            });
            
            log.info({ name: nodeName, displayName: instance.description.displayName }, 'Loaded node');
          }
        }
      }
    } catch (error) {
      log.error({ err: error, node: relativeNodePath }, 'Error loading node');
    }
  }

  /**
   * Load a credential from a package
   */
  private async loadCredential(packagePath: string, relativeCredPath: string, packageName: string): Promise<void> {
    const fullPath = path.join(packagePath, relativeCredPath);

    if (!fs.existsSync(fullPath)) {
      log.warn({ path: fullPath }, 'Credential file not found');
      return;
    }

    try {
      // Use dynamicRequire to bypass bundler analysis
      const credModule = dynamicRequire(fullPath);
      
      for (const exportName of Object.keys(credModule)) {
        const ExportedClass = credModule[exportName];
        
        if (typeof ExportedClass === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const instance = new (ExportedClass as new () => ICredentialType)();
          
          if (instance.name && instance.displayName) {
            this.loadedCredentials.set(instance.name, {
              type: instance,
              sourcePath: fullPath,
              packageName,
            });
            
            log.info({ name: instance.name, displayName: instance.displayName }, 'Loaded credential');
          }
        }
      }
    } catch (error) {
      log.error({ err: error, credential: relativeCredPath }, 'Error loading credential');
    }
  }

  // ==================== Public API ====================

  /**
   * Check if a node type is loaded
   */
  hasNode(name: string): boolean {
    return this.loadedNodes.has(name);
  }

  /**
   * Get a loaded node by name
   */
  getNode(name: string): INodeType | undefined {
    return this.loadedNodes.get(name)?.type;
  }

  /**
   * Get all loaded nodes
   */
  getAllNodes(): ILoadedNode[] {
    return Array.from(this.loadedNodes.values());
  }

  /**
   * Get all loaded node types (for palette display)
   */
  getAllNodeTypes(): INodeType[] {
    return Array.from(this.loadedNodes.values()).map(n => n.type);
  }

  /**
   * Check if a credential type is loaded
   */
  hasCredential(name: string): boolean {
    return this.loadedCredentials.has(name);
  }

  /**
   * Get a loaded credential by name
   */
  getCredential(name: string): ICredentialType | undefined {
    return this.loadedCredentials.get(name)?.type;
  }

  /**
   * Get all loaded credentials
   */
  getAllCredentials(): ILoadedCredential[] {
    return Array.from(this.loadedCredentials.values());
  }

  /**
   * Reload all packages (useful for development)
   */
  async reload(): Promise<void> {
    this.loadedNodes.clear();
    this.loadedCredentials.clear();
    this.isLoaded = false;
    await this.initialize();
  }

  /**
   * Get the custom nodes directory path
   */
  getCustomNodesPath(): string {
    return this.customNodesPath;
  }
}

// Singleton instance
export const nodeLoader = new NodeLoader();
