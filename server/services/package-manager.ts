import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { db } from "@/db/db";
import { packages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPackageTypeFallback } from "@/lib/package-type-fallbacks";
import { createLogger } from "@/lib/logger";

const log = createLogger('PackageManager');
const execAsync = promisify(exec);

export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface SearchResult {
  name: string;
  version: string;
  description: string;
  downloads?: number;
  repository?: string;
}

export class PackageManager {
  private packagesBasePath: string;

  constructor() {
    // Store packages in a directory in the project root
    this.packagesBasePath = path.join(process.cwd(), ".typeflow-packages");
  }

  /**
   * Get the packages directory for an organization
   */
  private getOrgPackagesPath(organizationId: string): string {
    return path.join(this.packagesBasePath, organizationId);
  }

  /**
   * Ensure packages directory exists
   */
  private async ensurePackagesDir(organizationId: string): Promise<string> {
    const orgPath = this.getOrgPackagesPath(organizationId);
    await fs.mkdir(orgPath, { recursive: true });
    return orgPath;
  }

  /**
   * Initialize package.json if it doesn't exist
   */
  private async ensurePackageJson(organizationId: string): Promise<void> {
    const orgPath = await this.ensurePackagesDir(organizationId);
    const packageJsonPath = path.join(orgPath, "package.json");

    try {
      await fs.access(packageJsonPath);
    } catch {
      // package.json doesn't exist, create it
      const packageJson = {
        name: `typeflow-org-${organizationId}`,
        version: "1.0.0",
        description: "Typeflow organization packages",
        private: true,
        dependencies: {},
      };
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2)
      );
    }
  }

  /**
   * Search for packages on npm
   */
  async searchPackages(query: string, limit = 20): Promise<SearchResult[]> {
    try {
      const { stdout } = await execAsync(
        `npm search ${query} --json --long --parseable`,
        { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
      );

      const results = JSON.parse(stdout);
      
      return results.slice(0, limit).map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || "",
        downloads: pkg.downloads,
        repository: pkg.links?.repository,
      }));
    } catch (error) {
      log.error({ err: error, query }, 'Error searching packages');
      return [];
    }
  }

  /**
   * Get package info from npm
   */
  async getPackageInfo(packageName: string): Promise<PackageInfo | null> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} --json`);
      const info = JSON.parse(stdout);

      return {
        name: info.name,
        version: info.version,
        description: info.description,
        dependencies: info.dependencies,
        devDependencies: info.devDependencies,
      };
    } catch (error) {
      log.error({ err: error, packageName }, 'Error getting package info');
      return null;
    }
  }

  /**
   * Extract type definitions from a package
   */
  private async extractTypeDefinitions(
    organizationId: string,
    packageName: string
  ): Promise<string | null> {
    try {
      const orgPath = this.getOrgPackagesPath(organizationId);
      const packagePath = path.join(orgPath, "node_modules", packageName);

      // Try to find .d.ts files or index.d.ts
      const possibleTypeFiles = [
        path.join(packagePath, "index.d.ts"),
        path.join(packagePath, `${packageName}.d.ts`),
        path.join(packagePath, "dist", "index.d.ts"),
        path.join(packagePath, "lib", "index.d.ts"),
        path.join(packagePath, "types", "index.d.ts"),
      ];

      for (const typeFile of possibleTypeFiles) {
        try {
          const content = await fs.readFile(typeFile, "utf-8");
          
          return content;
        } catch {
          // File doesn't exist, try next
        }
      }

      // Try @types package
      const typesPackagePath = path.join(orgPath, "node_modules", `@types/${packageName}`);
      try {
        const typeFile = path.join(typesPackagePath, "index.d.ts");
        const content = await fs.readFile(typeFile, "utf-8");
        
        return content;
      } catch {
        // No @types package
      }

      // Try fallback type definitions
      const fallback = getPackageTypeFallback(packageName);
      if (fallback) {
        
        return fallback;
      }

      
      return null;
    } catch (error) {
      log.error({ err: error, packageName }, 'Error extracting type definitions');
      return null;
    }
  }

  /**
   * Install a package for an organization
   */
  async installPackage(
    organizationId: string,
    packageName: string,
    version?: string
  ): Promise<{ success: boolean; error?: string; packageInfo?: PackageInfo }> {
    try {
      // Ensure directory and package.json exist
      const orgPath = await this.ensurePackagesDir(organizationId);
      await this.ensurePackageJson(organizationId);

      // Install package
      const packageSpec = version ? `${packageName}@${version}` : packageName;
      
      
      
      const { stdout, stderr } = await execAsync(
        `npm install ${packageSpec} --save --production`,
        {
          cwd: orgPath,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        }
      );

      
      if (stderr) 

      // Try to install @types if available
      try {
        
        await execAsync(`npm install @types/${packageName} --save-dev`, {
          cwd: orgPath,
          maxBuffer: 1024 * 1024 * 10,
        });
        
      } catch {
        
      }

      // Get installed package info
      const packageJsonPath = path.join(orgPath, "package.json");
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonContent);

      const installedVersion =
        packageJson.dependencies?.[packageName] || version || "latest";

      // Get full package info
      const packageInfo = await this.getPackageInfo(packageName);

      if (!packageInfo) {
        throw new Error("Failed to get package info after installation");
      }

      // Extract type definitions
      const typeDefinitions = await this.extractTypeDefinitions(organizationId, packageName);

      // Save to database
      await db.insert(packages).values({
        organizationId,
        name: packageName,
        version: packageInfo.version,
        packageJson: packageJson,
        typeDefinitions: typeDefinitions,
        dependencies: packageInfo.dependencies || {},
        devDependencies: packageInfo.devDependencies || {},
        isActive: true,
      }).onConflictDoUpdate({
        target: [packages.organizationId, packages.name],
        set: {
          version: packageInfo.version,
          packageJson: packageJson,
          typeDefinitions: typeDefinitions,
          dependencies: packageInfo.dependencies || {},
          devDependencies: packageInfo.devDependencies || {},
          installedAt: new Date(),
          isActive: true,
        },
      });

      return {
        success: true,
        packageInfo,
      };
    } catch (error: any) {
      log.error({ err: error, organizationId, packageName }, 'Error installing package');
      return {
        success: false,
        error: error.message || "Failed to install package",
      };
    }
  }

  /**
   * Uninstall a package for an organization
   */
  async uninstallPackage(
    organizationId: string,
    packageName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const orgPath = this.getOrgPackagesPath(organizationId);

      // Check if package exists
      try {
        await fs.access(path.join(orgPath, "node_modules", packageName));
      } catch {
        // Package not installed, just remove from DB
        await db
          .delete(packages)
          .where(
            and(
              eq(packages.organizationId, organizationId),
              eq(packages.name, packageName)
            )
          );
        return { success: true };
      }

      // Uninstall package
      
      
      await execAsync(`npm uninstall ${packageName}`, {
        cwd: orgPath,
      });

      // Remove from database
      await db
        .delete(packages)
        .where(
          and(
            eq(packages.organizationId, organizationId),
            eq(packages.name, packageName)
          )
        );

      return { success: true };
    } catch (error: any) {
      log.error({ err: error, organizationId, packageName }, 'Error uninstalling package');
      return {
        success: false,
        error: error.message || "Failed to uninstall package",
      };
    }
  }

  /**
   * List all installed packages for an organization
   */
  async listPackages(organizationId: string) {
    return await db.query.packages.findMany({
      where: eq(packages.organizationId, organizationId),
      orderBy: (packages, { desc }) => [desc(packages.installedAt)],
    });
  }

  /**
   * Get the node_modules path for an organization
   */
  getNodeModulesPath(organizationId: string): string {
    return path.join(this.getOrgPackagesPath(organizationId), "node_modules");
  }

  /**
   * Check if a package is installed
   */
  async isPackageInstalled(
    organizationId: string,
    packageName: string
  ): Promise<boolean> {
    const orgPath = this.getOrgPackagesPath(organizationId);
    const packagePath = path.join(orgPath, "node_modules", packageName);

    try {
      await fs.access(packagePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const packageManager = new PackageManager();

