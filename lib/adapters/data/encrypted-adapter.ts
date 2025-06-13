/**
 * Encrypted Data Adapter - Implements DataAccessPort with transparent encryption
 * This adapter provides AES-256-GCM encryption for vault data storage
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash, pbkdf2Sync, DecipherGCM } from 'crypto';
import { promises as fs } from 'fs';
import { DataAccessPort } from '../../domain/ports/secondary.js';

export interface EncryptedDataConfig {
  vaultPath: string;
  policiesPath?: string;
  encryptionKey?: string;    // Master key for encryption
  keyDerivation?: {
    iterations: number;       // PBKDF2 iterations (default: 100000)
    salt?: string;           // Salt for key derivation (if not provided, will be auto-generated)
    keyLength: number;       // Derived key length in bytes (default: 32 for AES-256)
  };
  cacheEnabled?: boolean;    // Enable in-memory caching (default: true)
  compressionEnabled?: boolean; // Enable data compression before encryption (default: false)
}

interface EncryptedVaultStructure {
  version: string;           // Encryption version for future compatibility
  algorithm: string;         // Encryption algorithm used
  keyDerivation: {
    iterations: number;
    salt: string;
    keyLength: number;
  };
  encryptedData: string;     // Base64 encoded encrypted data
  iv: string;               // Initialization vector
  authTag: string;          // Authentication tag for GCM
  timestamp: string;        // Last encryption timestamp
  checksum: string;         // SHA-256 checksum of original data
}

interface AccessPolicy {
  allowed_paths?: Record<string, string[]>;
  wildcard_paths?: Record<string, string[]>;
  default_policy?: 'allow' | 'deny';
  rate_limits?: Record<string, {
    requests_per_minute: number;
    requests_per_hour: number;
  }>;
}

export class EncryptedDataAdapter implements DataAccessPort {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly DEFAULT_ITERATIONS = 100000;
  private static readonly DEFAULT_KEY_LENGTH = 32;
  private static readonly VAULT_VERSION = '1.0.0';

  private dataCache: Record<string, any> = {};
  private policiesCache: AccessPolicy | null = null;
  private encryptionKey: Buffer | null = null;
  private accessCounts: Map<string, { count: number; lastReset: number }> = new Map();

  constructor(private config: EncryptedDataConfig) {
    if (!config.encryptionKey) {
      throw new Error('Encryption key is required for EncryptedDataAdapter');
    }
    this.initializeEncryptionKey();
  }

  async getData(path: string[]): Promise<any> {
    const cacheKey = path.join('.');
    
    // Return cached data if available and caching is enabled
    if (this.config.cacheEnabled !== false && this.dataCache[cacheKey]) {
      return this.dataCache[cacheKey];
    }

    const vault = await this.loadVault();
    const data = this.extractNestedData(vault, path);
    
    // Cache the result if caching is enabled
    if (this.config.cacheEnabled !== false) {
      this.dataCache[cacheKey] = data;
    }
    
    return data;
  }

  async validateDataAccess(path: string[], requester: string): Promise<boolean> {
    // Check rate limiting first
    if (!this.checkRateLimit(requester)) {
      return false;
    }

    const policies = await this.loadPolicies();
    
    // If no policies file, use default policy or allow access
    if (!policies) {
      return true; // Default to allow in development mode
    }

    // Apply default policy if specified
    if (policies.default_policy === 'deny' && !this.hasExplicitAccess(path, requester, policies)) {
      return false;
    }

    const pathString = path.join('.');
    
    // Check exact path match
    if (policies.allowed_paths && policies.allowed_paths[pathString]) {
      const allowedRequesters = policies.allowed_paths[pathString];
      return allowedRequesters.includes('*') || allowedRequesters.includes(requester);
    }

    // Check wildcard matches
    if (policies.wildcard_paths) {
      for (const [pattern, allowedRequesters] of Object.entries(policies.wildcard_paths)) {
        if (this.matchesWildcard(pathString, pattern)) {
          return allowedRequesters.includes('*') || allowedRequesters.includes(requester);
        }
      }
    }

    // Default to allow if no explicit deny policy
    return policies.default_policy !== 'deny';
  }

  async hasData(path: string[]): Promise<boolean> {
    try {
      const data = await this.getData(path);
      return data !== undefined && data !== null;
    } catch {
      return false;
    }
  }

  /**
   * Encrypts and saves vault data
   */
  async saveVault(data: any): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const serializedData = JSON.stringify(data);
    const checksum = createHash('sha256').update(serializedData, 'utf8').digest('hex');
    
    // Generate random IV for this encryption
    const iv = randomBytes(16);
    const cipher = createCipheriv(EncryptedDataAdapter.ALGORITHM, this.encryptionKey, iv);
    
    let encrypted = cipher.update(serializedData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    const vaultStructure: EncryptedVaultStructure = {
      version: EncryptedDataAdapter.VAULT_VERSION,
      algorithm: EncryptedDataAdapter.ALGORITHM,
      keyDerivation: {
        iterations: this.config.keyDerivation?.iterations || EncryptedDataAdapter.DEFAULT_ITERATIONS,
        salt: this.config.keyDerivation?.salt || '',
        keyLength: this.config.keyDerivation?.keyLength || EncryptedDataAdapter.DEFAULT_KEY_LENGTH,
      },
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      timestamp: new Date().toISOString(),
      checksum
    };

    await fs.writeFile(this.config.vaultPath, JSON.stringify(vaultStructure, null, 2), 'utf8');
    
    // Clear cache to force reload
    this.dataCache = {};
  }

  /**
   * Clears the data cache
   */
  clearCache(): void {
    this.dataCache = {};
    this.policiesCache = null;
  }

  /**
   * Updates the encryption key and re-encrypts all data
   */
  async rotateEncryptionKey(newEncryptionKey: string): Promise<void> {
    // Load current data with old key
    const currentData = await this.loadVault();
    
    // Update encryption key
    this.config.encryptionKey = newEncryptionKey;
    this.initializeEncryptionKey();
    
    // Re-encrypt with new key
    await this.saveVault(currentData);
  }

  private initializeEncryptionKey(): void {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key is required');
    }

    const keyDerivation = this.config.keyDerivation;
    const iterations = keyDerivation?.iterations || EncryptedDataAdapter.DEFAULT_ITERATIONS;
    const keyLength = keyDerivation?.keyLength || EncryptedDataAdapter.DEFAULT_KEY_LENGTH;
    let salt = keyDerivation?.salt;

    // Generate salt if not provided
    if (!salt) {
      salt = randomBytes(16).toString('hex');
      // Update config with generated salt for future use
      if (!this.config.keyDerivation) {
        this.config.keyDerivation = {
          iterations,
          keyLength,
          salt
        };
      } else {
        this.config.keyDerivation.salt = salt;
      }
    }

    // Derive encryption key using PBKDF2
    this.encryptionKey = pbkdf2Sync(
      this.config.encryptionKey,
      salt,
      iterations,
      keyLength,
      'sha256'
    );
  }

  private async loadVault(): Promise<any> {
    try {
      const fileContent = await fs.readFile(this.config.vaultPath, 'utf8');
      
      // Try to parse as encrypted vault first
      try {
        const vaultStructure: EncryptedVaultStructure = JSON.parse(fileContent);
        
        // Check if it's an encrypted vault by looking for our specific structure
        if (vaultStructure.version && vaultStructure.encryptedData && vaultStructure.algorithm) {
          return this.decryptVaultData(vaultStructure);
        }
      } catch (parseError) {
        // If JSON parsing failed, it's likely corrupted
        throw new Error(`Failed to parse vault file: ${(parseError as Error).message}`);
      }
      
      // If not encrypted, treat as plain JSON and auto-encrypt it
      const plainData = JSON.parse(fileContent);
      
      // Auto-encrypt plain JSON vaults for security
      await this.saveVault(plainData);
      
      return plainData;
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Vault file not found: ${this.config.vaultPath}`);
      }
      throw new Error(`Failed to load vault: ${(error as Error).message}`);
    }
  }

  private decryptVaultData(vaultStructure: EncryptedVaultStructure): any {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    // Verify version compatibility
    if (vaultStructure.version !== EncryptedDataAdapter.VAULT_VERSION) {
      throw new Error(`Unsupported vault version: ${vaultStructure.version}`);
    }

    try {
      const iv = Buffer.from(vaultStructure.iv, 'base64');
      const authTag = Buffer.from(vaultStructure.authTag, 'base64');
      
      const decipher = createDecipheriv(vaultStructure.algorithm, this.encryptionKey, iv) as DecipherGCM;
      decipher.setAuthTag(authTag);
      
      let decrypted: string;
      try {
        decrypted = decipher.update(vaultStructure.encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
      } catch (decryptError) {
        // This typically means wrong key or corrupted data
        if ((decryptError as Error).message.includes('bad decrypt')) {
          throw new Error('Failed to decrypt vault: Invalid encryption key or corrupted data');
        }
        throw new Error(`Failed to decrypt vault: ${(decryptError as Error).message}`);
      }
      
      let data: any;
      try {
        data = JSON.parse(decrypted);
      } catch (jsonError) {
        throw new Error(`Failed to parse decrypted data: ${(jsonError as Error).message}`);
      }
      
      // Verify checksum if provided
      if (vaultStructure.checksum) {
        const actualChecksum = createHash('sha256').update(decrypted, 'utf8').digest('hex');
        if (actualChecksum !== vaultStructure.checksum) {
          throw new Error('Data integrity check failed - checksum mismatch');
        }
      }
      
      return data;
      
    } catch (error) {
      // Re-throw our custom error messages, or wrap others
      if ((error as Error).message.startsWith('Failed to decrypt vault:') || 
          (error as Error).message.startsWith('Data integrity check failed') ||
          (error as Error).message.startsWith('Failed to parse decrypted data:')) {
        throw error;
      }
      throw new Error(`Failed to decrypt vault: ${(error as Error).message}`);
    }
  }

  private async loadPolicies(): Promise<AccessPolicy | null> {
    if (this.policiesCache) {
      return this.policiesCache;
    }

    if (!this.config.policiesPath) {
      return null;
    }

    try {
      const content = await fs.readFile(this.config.policiesPath, 'utf8');
      this.policiesCache = JSON.parse(content);
      return this.policiesCache;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Policies file doesn't exist, return null
        return null;
      }
      throw new Error(`Failed to load policies: ${(error as Error).message}`);
    }
  }

  private extractNestedData(data: any, path: string[]): any {
    let current = data;
    
    for (const segment of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      if (typeof current !== 'object') {
        return undefined;
      }
      
      current = current[segment];
    }
    
    return current;
  }

  private hasExplicitAccess(path: string[], requester: string, policies: AccessPolicy): boolean {
    const pathString = path.join('.');
    
    // Check exact path
    if (policies.allowed_paths && policies.allowed_paths[pathString]) {
      const allowedRequesters = policies.allowed_paths[pathString];
      return allowedRequesters.includes('*') || allowedRequesters.includes(requester);
    }
    
    // Check wildcards
    if (policies.wildcard_paths) {
      for (const [pattern, allowedRequesters] of Object.entries(policies.wildcard_paths)) {
        if (this.matchesWildcard(pathString, pattern)) {
          return allowedRequesters.includes('*') || allowedRequesters.includes(requester);
        }
      }
    }
    
    return false;
  }

  private matchesWildcard(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(path);
  }

  private checkRateLimit(requester: string): boolean {
    const policies = this.policiesCache;
    if (!policies || !policies.rate_limits || !policies.rate_limits[requester]) {
      return true; // No rate limits defined
    }

    const limits = policies.rate_limits[requester];
    const now = Date.now();
    const accessData = this.accessCounts.get(requester) || { count: 0, lastReset: now };

    // Reset counter if more than a minute has passed
    if (now - accessData.lastReset > 60000) {
      accessData.count = 0;
      accessData.lastReset = now;
    }

    accessData.count++;
    this.accessCounts.set(requester, accessData);

    // Check per-minute limit
    if (limits.requests_per_minute && accessData.count > limits.requests_per_minute) {
      return false;
    }

    // For hourly limits, we'd need a more sophisticated tracking mechanism
    // This is a simplified implementation
    return true;
  }
}