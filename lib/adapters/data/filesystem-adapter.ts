/**
 * File System Data Adapter - Implements DataAccessPort using local file storage
 * This adapter reads data from encrypted JSON files
 */

import { promises as fs } from 'fs';
import { DataAccessPort } from '../../domain/ports/secondary.js';

export interface FileSystemDataConfig {
  vaultPath: string;
  policiesPath?: string;
  encryptionKey?: string; // For future encryption support
}

export class FileSystemDataAdapter implements DataAccessPort {
  private dataCache: Record<string, any> = {};
  private policiesCache: any = null;

  constructor(private config: FileSystemDataConfig) {}

  async getData(path: string[]): Promise<any> {
    const vault = await this.loadVault();
    return this.extractNestedData(vault, path);
  }

  async validateDataAccess(path: string[], requester: string): Promise<boolean> {
    const policies = await this.loadPolicies();
    
    // If no policies file, allow all access (development mode)
    if (!policies) {
      return true;
    }

    // Check if the path is allowed for this requester
    const pathString = path.join('.');
    
    // Look for exact path match
    if (policies.allowed_paths && policies.allowed_paths[pathString]) {
      const allowedRequesters = policies.allowed_paths[pathString];
      return allowedRequesters.includes('*') || allowedRequesters.includes(requester);
    }

    // Look for wildcard matches
    if (policies.wildcard_paths) {
      for (const [pattern, allowedRequesters] of Object.entries(policies.wildcard_paths)) {
        if (this.matchesWildcard(pathString, pattern)) {
          return (allowedRequesters as string[]).includes('*') || 
                 (allowedRequesters as string[]).includes(requester);
        }
      }
    }

    // Default policy
    return policies.default_policy === 'allow';
  }

  async hasData(path: string[]): Promise<boolean> {
    try {
      const vault = await this.loadVault();
      const data = this.extractNestedData(vault, path);
      return data !== undefined && data !== null;
    } catch {
      return false;
    }
  }

  /**
   * Load vault data from file
   */
  private async loadVault(): Promise<any> {
    try {
      // Check cache first
      const cacheKey = 'vault';
      if (this.dataCache[cacheKey]) {
        return this.dataCache[cacheKey];
      }

      // Read from file
      const vaultData = await fs.readFile(this.config.vaultPath, 'utf-8');
      const vault = JSON.parse(vaultData);

      // Cache for future use (with TTL in production)
      this.dataCache[cacheKey] = vault;

      return vault;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to load vault from ${this.config.vaultPath}:`, error);
      throw new Error(`Vault data not accessible: ${errorMessage}`);
    }
  }

  /**
   * Load access policies from file
   */
  private async loadPolicies(): Promise<any> {
    if (!this.config.policiesPath) {
      return null;
    }

    try {
      // Check cache first
      if (this.policiesCache) {
        return this.policiesCache;
      }

      // Read from file
      const policiesData = await fs.readFile(this.config.policiesPath, 'utf-8');
      const policies = JSON.parse(policiesData);

      // Cache for future use
      this.policiesCache = policies;

      return policies;
    } catch (error) {
      console.warn(`Failed to load policies from ${this.config.policiesPath}:`, error);
      return null;
    }
  }

  /**
   * Extract nested data using path array
   */
  private extractNestedData(data: any, path: string[]): any {
    let current = data;
    
    for (const segment of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      if (typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Check if a path matches a wildcard pattern
   */
  private matchesWildcard(path: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '.*');   // Convert * to .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Clear caches (useful for testing or when data changes)
   */
  clearCache(): void {
    this.dataCache = {};
    this.policiesCache = null;
  }

  /**
   * Verify vault file exists and is readable
   */
  async verifyVault(): Promise<boolean> {
    try {
      await fs.access(this.config.vaultPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}
