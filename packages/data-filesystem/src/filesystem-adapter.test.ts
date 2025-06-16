/**
 * Tests for File System Data Adapter
 * Demonstrates Node.js native test runner with VQP data access functionality
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { FileSystemDataAdapter } from './filesystem-adapter.js';
import { VQPError } from '@vqp/core';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

describe('File System Data Adapter', () => {
  const testVaultPath = path.join(tmpdir(), 'test-vault.json');
  const testVaultData = {
    personal: {
      age: 25,
      citizenship: 'US',
      has_drivers_license: true,
    },
    system: {
      uptime_percentage_24h: 99.5,
      error_rate_percentage: 0.1,
    },
  };

  // Setup test vault file
  test('setup test vault', async () => {
    await fs.writeFile(testVaultPath, JSON.stringify(testVaultData, null, 2));
    const exists = await fs
      .access(testVaultPath)
      .then(() => true)
      .catch(() => false);
    assert.ok(exists, 'Test vault file should be created');
  });

  test('should create instance with valid vault path', async () => {
    const adapter = new FileSystemDataAdapter({ vaultPath: testVaultPath });
    assert.ok(adapter, 'Adapter should be created successfully');
  });

  test('should retrieve nested data correctly', async () => {
    const adapter = new FileSystemDataAdapter({ vaultPath: testVaultPath });

    const age = await adapter.getData(['personal', 'age']);
    assert.strictEqual(age, 25, 'Should retrieve correct age value');

    const citizenship = await adapter.getData(['personal', 'citizenship']);
    assert.strictEqual(citizenship, 'US', 'Should retrieve correct citizenship value');

    const uptime = await adapter.getData(['system', 'uptime_percentage_24h']);
    assert.strictEqual(uptime, 99.5, 'Should retrieve correct uptime value');
  });

  test('should return undefined for non-existent paths', async () => {
    const adapter = new FileSystemDataAdapter({ vaultPath: testVaultPath });

    const nonExistent = await adapter.getData(['nonexistent', 'path']);
    assert.strictEqual(nonExistent, undefined, 'Should return undefined for non-existent path');
  });

  test('should validate data access permissions', async () => {
    const adapter = new FileSystemDataAdapter({ vaultPath: testVaultPath });

    // This adapter allows all access by default
    const hasAccess = await adapter.validateDataAccess(['personal', 'age'], 'did:test:querier');
    assert.strictEqual(hasAccess, true, 'Should allow data access by default');
  });

  test('should handle invalid vault file gracefully', async () => {
    const invalidVaultPath = path.join(tmpdir(), 'non-existent-vault.json');
    const adapter = new FileSystemDataAdapter({ vaultPath: invalidVaultPath });

    // Test that the adapter properly throws an error for non-existent vault files
    try {
      await adapter.getData(['any', 'path']);
      assert.fail('Expected error to be thrown for invalid vault file');
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an Error instance');
      assert.ok(
        error.message.includes('Vault data not accessible'),
        'Error message should indicate vault access issue'
      );
      assert.ok(error.message.includes('ENOENT'), 'Error message should include ENOENT details');
    }
  });

  // Cleanup test vault file
  test('cleanup test vault', async () => {
    await fs.unlink(testVaultPath).catch(() => {}); // Ignore errors if file doesn't exist
    const exists = await fs
      .access(testVaultPath)
      .then(() => true)
      .catch(() => false);
    assert.strictEqual(exists, false, 'Test vault file should be cleaned up');
  });
});
