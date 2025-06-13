/**
 * End-to-End VQP Flow Tests
 * Tests the complete VQP flow with real adapters
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { VQPSystem } from '../../lib/vqp-system.js';
import { VQPQuery, VQPResponse } from '../../lib/domain/types.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('VQP End-to-End Flow', () => {
  let vqpSystem: VQPSystem;
  let testVaultPath: string;

  beforeEach(async () => {
    // Create temporary test files
    testVaultPath = join(process.cwd(), 'test-vault.json');

    // Create test vault data
    const testVault = {
      personal: {
        age: 28,
        citizenship: 'US',
        has_drivers_license: true,
      },
      financial: {
        annual_income: 75000,
        employment_status: 'employed',
      },
    };

    // Create test keys with proper hex format
    // Let's not provide keys and let the adapter generate them automatically

    writeFileSync(testVaultPath, JSON.stringify(testVault, null, 2));

    // Initialize VQP system with real adapters
    vqpSystem = new VQPSystem({
      data: {
        type: 'filesystem',
        vaultPath: testVaultPath,
      },
      crypto: {
        type: 'software',
        // No keyPairs - will auto-generate default key
      },
      vocabulary: {
        type: 'http',
        allowedVocabularies: ['vqp:identity:v1', 'vqp:financial:v1'],
        cacheTimeoutMs: 300000,
      },
      audit: {
        type: 'console',
        logLevel: 'info',
      },
      transport: {
        type: 'http',
        port: 3000,
      },
    });

    // Note: VQPSystem doesn't have initialize method, it's ready after construction
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testVaultPath)) unlinkSync(testVaultPath);
  });

  it('should process age verification query successfully', async () => {
    const query: VQPQuery = {
      id: uuidv4(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:test-querier.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 18] }, // Use vocabulary field name, not vault path
      },
    };

    const response = await vqpSystem.getService().processQuery(query);

    assert.strictEqual(response.queryId, query.id);
    assert.strictEqual(response.result, true); // Should be true since test data has age: 28
    assert.ok(response.proof);
    assert.strictEqual(response.proof.type, 'signature');
  });

  it('should handle income verification query', async () => {
    const query: VQPQuery = {
      id: uuidv4(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:bank.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:financial:v1',
        expr: { '>=': [{ var: 'annual_income' }, 50000] }, // Use vocabulary field name
      },
    };

    const response = await vqpSystem.getService().processQuery(query);

    assert.strictEqual(response.result, true); // Should be true since test data has annual_income: 75000
    assert.ok(response.proof);
  });

  it('should verify responses correctly', async () => {
    const query: VQPQuery = {
      id: uuidv4(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:verifier.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '==': [{ var: 'citizenship' }, 'US'] }, // Use vocabulary field name
      },
    };

    const response = await vqpSystem.getService().processQuery(query);
    const isValid = await vqpSystem.verify(response);

    assert.strictEqual(isValid, true);
  });

  it('should reject invalid queries', async () => {
    const invalidQuery = {
      id: 'invalid-id', // Not a UUID
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:test.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 18] },
      },
    };

    try {
      await vqpSystem.getService().processQuery(invalidQuery as any);
      assert.fail('Should have thrown an error for invalid query ID');
    } catch (error: any) {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('Invalid query ID'));
    }
  });
});
