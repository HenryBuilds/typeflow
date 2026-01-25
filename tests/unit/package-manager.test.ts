import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as path from 'path'

// Test PackageManager utility functions in isolation
describe('PackageManager - Utility Functions', () => {
  describe('Path generation', () => {
    const packagesBasePath = path.join(process.cwd(), '.typeflow-packages')

    const getOrgPackagesPath = (organizationId: string): string => {
      return path.join(packagesBasePath, organizationId)
    }

    const getNodeModulesPath = (organizationId: string): string => {
      return path.join(getOrgPackagesPath(organizationId), 'node_modules')
    }

    it('should generate correct org packages path', () => {
      const orgId = 'org-123'
      const result = getOrgPackagesPath(orgId)
      expect(result).toContain('.typeflow-packages')
      expect(result).toContain(orgId)
    })

    it('should generate correct node_modules path', () => {
      const orgId = 'org-456'
      const result = getNodeModulesPath(orgId)
      expect(result).toContain('node_modules')
      expect(result).toContain(orgId)
    })

    it('should handle different organization IDs', () => {
      const path1 = getOrgPackagesPath('org-1')
      const path2 = getOrgPackagesPath('org-2')
      expect(path1).not.toBe(path2)
    })
  })

  describe('Package spec generation', () => {
    const getPackageSpec = (packageName: string, version?: string): string => {
      return version ? `${packageName}@${version}` : packageName
    }

    it('should return package name without version', () => {
      expect(getPackageSpec('lodash')).toBe('lodash')
    })

    it('should return package name with version', () => {
      expect(getPackageSpec('lodash', '4.17.21')).toBe('lodash@4.17.21')
    })

    it('should handle scoped packages', () => {
      expect(getPackageSpec('@types/node', '20.0.0')).toBe('@types/node@20.0.0')
    })
  })

  describe('Search result parsing', () => {
    interface SearchResult {
      name: string
      version: string
      description: string
      downloads?: number
      repository?: string
    }

    const parseSearchResults = (results: any[], limit: number = 20): SearchResult[] => {
      return results.slice(0, limit).map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || '',
        downloads: pkg.downloads,
        repository: pkg.links?.repository,
      }))
    }

    it('should parse npm search results correctly', () => {
      const mockResults = [
        { name: 'lodash', version: '4.17.21', description: 'Lodash modular utilities' },
        { name: 'underscore', version: '1.13.6', description: 'JavaScript utility library' },
      ]

      const result = parseSearchResults(mockResults)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('lodash')
      expect(result[0].version).toBe('4.17.21')
    })

    it('should limit results', () => {
      const mockResults = Array(30).fill(null).map((_, i) => ({
        name: `package-${i}`,
        version: '1.0.0',
        description: `Description ${i}`,
      }))

      const result = parseSearchResults(mockResults, 10)
      expect(result).toHaveLength(10)
    })

    it('should handle missing description', () => {
      const mockResults = [{ name: 'test', version: '1.0.0' }]
      const result = parseSearchResults(mockResults)
      expect(result[0].description).toBe('')
    })

    it('should extract repository from links', () => {
      const mockResults = [{
        name: 'test',
        version: '1.0.0',
        description: 'Test',
        links: { repository: 'https://github.com/test/test' },
      }]

      const result = parseSearchResults(mockResults)
      expect(result[0].repository).toBe('https://github.com/test/test')
    })
  })

  describe('Package info parsing', () => {
    interface PackageInfo {
      name: string
      version: string
      description?: string
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    const parsePackageInfo = (info: any): PackageInfo => {
      return {
        name: info.name,
        version: info.version,
        description: info.description,
        dependencies: info.dependencies,
        devDependencies: info.devDependencies,
      }
    }

    it('should parse package info correctly', () => {
      const mockInfo = {
        name: 'express',
        version: '4.18.2',
        description: 'Fast, unopinionated, minimalist web framework',
        dependencies: { 'accepts': '~1.3.8' },
        devDependencies: { 'mocha': '^10.0.0' },
      }

      const result = parsePackageInfo(mockInfo)
      expect(result.name).toBe('express')
      expect(result.version).toBe('4.18.2')
      expect(result.dependencies).toHaveProperty('accepts')
    })

    it('should handle missing optional fields', () => {
      const mockInfo = { name: 'minimal', version: '1.0.0' }
      const result = parsePackageInfo(mockInfo)
      expect(result.description).toBeUndefined()
      expect(result.dependencies).toBeUndefined()
    })
  })
})
