/**
 * Test for EncryptedDataAdapter
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { deepStrictEqual, strictEqual, rejects } from 'node:assert';
import { promises as fs } from 'fs';
import { join } from 'path';
import { EncryptedDataAdapter } from '../../../lib/adapters/data/encrypted-adapter.js';

describe('EncryptedDataAdapter', () => {
  const testVaultPath = join(process.cwd(), 'test-encrypted-vault.json');
  const testPoliciesPath = join(process.cwd(), 'test-policies.json');
  const encryptionKey = 'test-encryption-key-secure-password-123';
  
  let adapter: EncryptedDataAdapter;
  
  // Test data
  const testVaultData = {
    personal: {
      age: 28,
      citizenship: 'US',
      has_drivers_license: true
    },
    financial: {
      annual_income: 75000,
      employment_status: 'employed'
    },
    system: {
      uptime_percentage_24h: 99.8,
      processed_events_last_hour: 1250
    }
  };

  const testPolicies = {
    allowed_paths: {
      'personal.age': ['test-requester', 'allowed-user'],
      'financial.annual_income': ['financial-service']
    },
    wildcard_paths: {
      'system.*': ['*']
    },
    default_policy: 'deny' as const,
    rate_limits: {
      'rate-limited-user': {
        requests_per_minute: 5,
        requests_per_hour: 100
      }
    }
  };

  beforeEach(async () => {
    // Create test policies file
    await fs.writeFile(testPoliciesPath, JSON.stringify(testPolicies, null, 2));
    
    // Initialize adapter
    adapter = new EncryptedDataAdapter({
      vaultPath: testVaultPath,
      policiesPath: testPoliciesPath,
      encryptionKey,
      keyDerivation: {
        iterations: 1000, // Lower for faster tests
        salt: 'test-salt-fixed',
        keyLength: 32
      },
      cacheEnabled: true
    });

    // Save test data (this will encrypt it)
    await adapter.saveVault(testVaultData);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testVaultPath);
      await fs.unlink(testPoliciesPath);
    } catch {
      // Ignore if files don't exist
    }
  });

  describe('Data Access', () => {
    it('should retrieve data correctly', async () => {
      const age = await adapter.getData(['personal', 'age']);
      strictEqual(age, 28);

      const citizenship = await adapter.getData(['personal', 'citizenship']);
      strictEqual(citizenship, 'US');

      const income = await adapter.getData(['financial', 'annual_income']);
      strictEqual(income, 75000);
    });

    it('should return undefined for non-existent paths', async () => {
      const nonExistent = await adapter.getData(['non', 'existent', 'path']);
      strictEqual(nonExistent, undefined);
    });

    it('should handle nested object retrieval', async () => {
      const personal = await adapter.getData(['personal']);
      deepStrictEqual(personal, testVaultData.personal);
    });

    it('should check data existence', async () => {
      const hasAge = await adapter.hasData(['personal', 'age']);
      strictEqual(hasAge, true);

      const hasNonExistent = await adapter.hasData(['non', 'existent']);
      strictEqual(hasNonExistent, false);
    });
  });

  describe('Access Control', () => {
    it('should allow access for authorized requesters', async () => {
      const canAccess = await adapter.validateDataAccess(['personal', 'age'], 'test-requester');
      strictEqual(canAccess, true);
    });

    it('should deny access for unauthorized requesters', async () => {
      const canAccess = await adapter.validateDataAccess(['personal', 'age'], 'unauthorized-user');
      strictEqual(canAccess, false);
    });

    it('should allow wildcard access', async () => {
      const canAccess = await adapter.validateDataAccess(['system', 'uptime_percentage_24h'], 'any-user');
      strictEqual(canAccess, true);
    });

    it('should respect default deny policy', async () => {
      const canAccess = await adapter.validateDataAccess(['personal', 'has_drivers_license'], 'random-user');
      strictEqual(canAccess, false);
    });

    it('should allow access to specific financial data for authorized service', async () => {
      const canAccess = await adapter.validateDataAccess(['financial', 'annual_income'], 'financial-service');
      strictEqual(canAccess, true);
    });
  });

  describe('Encryption and Security', () => {
    it('should encrypt vault data on disk', async () => {
      const fileContent = await fs.readFile(testVaultPath, 'utf8');
      const vaultStructure = JSON.parse(fileContent);
      
      // Should have encrypted structure
      strictEqual(vaultStructure.version, '1.0.0');
      strictEqual(vaultStructure.algorithm, 'aes-256-gcm');
      strictEqual(typeof vaultStructure.encryptedData, 'string');
      strictEqual(typeof vaultStructure.iv, 'string');
      strictEqual(typeof vaultStructure.authTag, 'string');
      
      // The most important check: encrypted data should not contain readable JSON
      const encryptedData = vaultStructure.encryptedData;
      
      // Encrypted data should not contain the plain JSON structure
      strictEqual(encryptedData.includes('personal'), false);
      strictEqual(encryptedData.includes('financial'), false);
      strictEqual(encryptedData.includes('citizenship'), false);
      strictEqual(encryptedData.includes('annual_income'), false);
      strictEqual(encryptedData.includes('employment_status'), false);
      
      // Verify the encrypted data is base64 encoded
      strictEqual(/^[A-Za-z0-9+/=]+$/.test(encryptedData), true);
    });

    it('should fail with wrong encryption key', async () => {
      const wrongKeyAdapter = new EncryptedDataAdapter({
        vaultPath: testVaultPath,
        encryptionKey: 'wrong-key'
      });

      await rejects(
        async () => await wrongKeyAdapter.getData(['personal', 'age']),
        /Failed to decrypt vault/
      );
    });

    it('should validate data integrity with checksum', async () => {
      // Load the encrypted file and tamper with it
      const fileContent = await fs.readFile(testVaultPath, 'utf8');
      const vaultStructure = JSON.parse(fileContent);
      
      // Tamper with the encrypted data
      vaultStructure.encryptedData = vaultStructure.encryptedData.replace(/^./, 'X');
      
      await fs.writeFile(testVaultPath, JSON.stringify(vaultStructure));

      await rejects(
        async () => await adapter.getData(['personal', 'age']),
        /Failed to decrypt vault/
      );
    });

    it('should rotate encryption keys', async () => {
      // Verify we can read data with original key
      const originalAge = await adapter.getData(['personal', 'age']);
      strictEqual(originalAge, 28);

      // Rotate to new key
      const newKey = 'new-secure-encryption-key-456';
      await adapter.rotateEncryptionKey(newKey);

      // Should still be able to read data
      const newAge = await adapter.getData(['personal', 'age']);
      strictEqual(newAge, 28);

      // Verify file is encrypted with new key by trying to decrypt with old key
      const oldKeyAdapter = new EncryptedDataAdapter({
        vaultPath: testVaultPath,
        encryptionKey
      });

      await rejects(
        async () => await oldKeyAdapter.getData(['personal', 'age']),
        /Failed to decrypt vault/
      );
    });
  });

  describe('Caching', () => {
    it('should use cache for repeated requests', async () => {
      // First request - loads from disk
      const age1 = await adapter.getData(['personal', 'age']);
      strictEqual(age1, 28);

      // Second request - should use cache
      const age2 = await adapter.getData(['personal', 'age']);
      strictEqual(age2, 28);
    });

    it('should clear cache when requested', async () => {
      // Load data into cache
      await adapter.getData(['personal', 'age']);

      // Clear cache
      adapter.clearCache();

      // Next request should load from disk again
      const age = await adapter.getData(['personal', 'age']);
      strictEqual(age, 28);
    });

    it('should clear cache after saving new data', async () => {
      // Load data into cache
      const originalAge = await adapter.getData(['personal', 'age']);
      strictEqual(originalAge, 28);

      // Update data
      const newData = { ...testVaultData };
      newData.personal.age = 30;
      await adapter.saveVault(newData);

      // Should get updated data (cache cleared)
      const updatedAge = await adapter.getData(['personal', 'age']);
      strictEqual(updatedAge, 30);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when vault file does not exist', async () => {
      const nonExistentAdapter = new EncryptedDataAdapter({
        vaultPath: '/non/existent/path.json',
        encryptionKey
      });

      await rejects(
        async () => await nonExistentAdapter.getData(['personal', 'age']),
        /Vault file not found/
      );
    });

    it('should throw error when encryption key is missing', () => {
      try {
        new EncryptedDataAdapter({
          vaultPath: testVaultPath
        } as any);
        throw new Error('Should have thrown an error');
      } catch (error) {
        strictEqual((error as Error).message, 'Encryption key is required for EncryptedDataAdapter');
      }
    });

    it('should handle corrupted vault file gracefully', async () => {
      await fs.writeFile(testVaultPath, 'invalid json content');

      await rejects(
        async () => await adapter.getData(['personal', 'age']),
        /Failed to load vault/
      );
    });
  });
});
