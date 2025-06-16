/**
 * End-to-End VQP Flow Tests
 * Tests the complete VQP flow with real adapters
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Import VQP modular packages
import { VQPService, QueryBuilder, VQPError, VQPQuery } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';
import { createMemoryAuditAdapter } from '@vqp/audit-memory';
import { createHTTPVocabularyResolver } from '@vqp/vocab-http';

describe('VQP End-to-End Flow', () => {
  let vqpService: VQPService;
  let testVaultPath: string;
  let testKeysDir: string;

  beforeEach(async () => {
    // Create temporary test files
    testVaultPath = join(process.cwd(), 'test-vault.json');
    testKeysDir = join(process.cwd(), 'test-keys');

    // Ensure keys directory exists
    if (!existsSync(testKeysDir)) {
      mkdirSync(testKeysDir, { recursive: true });
    }

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
        tax_resident_country: 'US'
      },
      system: {
        uptime_percentage_24h: 99.8,
        processed_events_last_hour: 1250,
        error_rate_percentage: 0.05,
        health_status: 'healthy'
      }
    };

    writeFileSync(testVaultPath, JSON.stringify(testVault, null, 2));

    // Create VQP service with modular adapters
    const dataAdapter = await createFileSystemDataAdapter({ vaultPath: testVaultPath });
    const cryptoAdapter = await createSoftwareCryptoAdapter();
    const evaluationAdapter = await createJSONLogicAdapter();
    const auditAdapter = await createMemoryAuditAdapter();
    const vocabularyAdapter = await createHTTPVocabularyResolver();

    vqpService = new VQPService(
      dataAdapter,
      cryptoAdapter,
      auditAdapter,
      evaluationAdapter,
      vocabularyAdapter
    );
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testVaultPath)) {
      unlinkSync(testVaultPath);
    }
    if (existsSync(testKeysDir)) {
      rmSync(testKeysDir, { recursive: true, force: true });
    }
  });

  test('should process age verification query successfully', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:example.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 18] }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.queryId, query.id);
    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
    assert.strictEqual(response.proof.type, 'signature');
    assert.ok(response.timestamp);
  });

  test('should process financial verification query successfully', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:bank.example.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:financial:v1',
        expr: { '>=': [{ var: 'annual_income' }, 50000] }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.queryId, query.id);
    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
    assert.strictEqual(response.proof.type, 'signature');
  });

  test('should process system metrics query successfully', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:monitoring.example.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:metrics:v1',
        expr: {
          'and': [
            { '>=': [{ var: 'uptime_percentage_24h' }, 99.0] },
            { '<=': [{ var: 'error_rate_percentage' }, 1.0] }
          ]
        }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.queryId, query.id);
    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should handle complex boolean logic', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:verifier.example.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: {
          'and': [
            { '>=': [{ var: 'age' }, 21] },
            { '==': [{ var: 'citizenship' }, 'US'] },
            { '==': [{ var: 'has_drivers_license' }, true] }
          ]
        }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should return false for failing conditions', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:test.example.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 50] } // Age is 28, so this should fail
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, false);
    assert.ok(response.proof); // Should still be signed
  });

  test('should reject query with missing ID', async () => {
    const invalidQuery: any = {
      // id is missing
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:example:test',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 18] },
      },
    };
    delete invalidQuery.id; // Explicitly ensure id is not present
    await assert.rejects(
      async () => vqpService.processQuery(invalidQuery as VQPQuery),
      (err: Error) => {
        assert.ok(err instanceof VQPError, 'Error should be a VQPError');
        assert.strictEqual((err as VQPError).code, 'EVALUATION_ERROR');
        assert.match((err as VQPError).message, /Missing required fields/);
        return true;
      }
    );
  });

  test('should reject query with invalid ID format', async () => {
    const invalidQuery: any = {
      id: 'not-a-uuid', // Invalid ID format
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:example:test',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 18] },
      },
    };
    await assert.rejects(
      async () => vqpService.processQuery(invalidQuery as VQPQuery),
      (err: Error) => {
        assert.ok(err instanceof VQPError, 'Error should be a VQPError');
        assert.strictEqual((err as VQPError).code, 'EVALUATION_ERROR');
        assert.match((err as VQPError).message, /Invalid query ID format/);
        return true;
      }
    );
  });

  test('should use QueryBuilder for easier query construction', async () => {
    const query = new QueryBuilder()
      .id(randomUUID())
      .requester('did:web:builder.example.com')
      .vocabulary('vqp:financial:v1')
      .expression({
        'and': [
          { '>=': [{ var: 'annual_income' }, 60000] },
          { '==': [{ var: 'employment_status' }, 'employed'] }
        ]
      })
      .build();

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
    assert.strictEqual(response.queryId, query.id);
  });

  test('should process end-to-end system query', async () => {
    const systemQuery = new QueryBuilder()
      .id(randomUUID())
      .requester('did:web:e2e-requester')
      .target('did:web:e2e-target')
      .vocabulary('vqp:metrics:v1') // Changed from vqp:system:v1
      .expression({
        and: [
          { '>=': [{ var: 'uptime_percentage_24h' }, 99.0] },
          { '<=': [{ var: 'error_rate_percentage' }, 1.0] },
          { '==': [{ var: 'health_status' }, 'healthy'] },
        ],
      })
      .build();

    const response = await vqpService.processQuery(systemQuery);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
    assert.strictEqual(response.queryId, systemQuery.id);
  });
});
