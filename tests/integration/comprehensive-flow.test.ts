/**
 * Comprehensive VQP Flow Tests
 * Tests complex scenarios with multiple vocabularies and query types
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Import VQP modular packages
import { VQPService, QueryBuilder, type VQPQuery, type VQPResponse } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';
import { createMemoryAuditAdapter } from '@vqp/audit-memory';
import { createHTTPVocabularyResolver } from '@vqp/vocab-http';

describe('VQP Comprehensive Flow Tests', () => {
  let vqpService: VQPService;
  let testVaultPath: string;
  let testKeysDir: string;

  beforeEach(async () => {
    // Create comprehensive test vault with multiple data domains
    testVaultPath = join(process.cwd(), 'comprehensive-test-vault.json');
    testKeysDir = join(process.cwd(), 'comprehensive-test-keys');

    // Ensure keys directory exists
    if (!existsSync(testKeysDir)) {
      mkdirSync(testKeysDir, { recursive: true });
    }

    // Create comprehensive test data across multiple vocabularies
    const comprehensiveVault = {
      personal: {
        age: 32,
        citizenship: 'US',
        has_drivers_license: true,
        has_passport: true,
        email_verified: true,
        phone_verified: true
      },
      financial: {
        annual_income: 95000,
        monthly_income: 7916,
        employment_status: 'employed',
        employment_duration_months: 36,
        credit_score: 750,
        has_bank_account: true,
        debt_to_income_ratio: 0.25,
        tax_resident_country: 'US'
      },
      health: {
        vaccinations_completed: ['COVID-19', 'influenza', 'hepatitis_b'],
        covid_vaccination_doses: 3,
        last_vaccination_date: '2024-10-15',
        blood_type: 'O+',
        allergies: [],
        chronic_conditions: [],
        medical_device_implanted: false,
        pregnant: false,
        recent_surgery_90_days: false,
        insurance_verified: true
      },
      system: {
        uptime_percentage_24h: 99.95,
        uptime_percentage_7d: 99.8,
        response_time_p50_ms: 45,
        response_time_p95_ms: 150,
        response_time_p99_ms: 300,
        error_rate_percentage: 0.02,
        throughput_rps: 500,
        processed_events_last_hour: 1800,
        cpu_usage_percentage: 35.5,
        memory_usage_percentage: 62.0,
        disk_usage_percentage: 45.0,
        health_status: 'healthy'
      },
      academic: {
        degrees_earned: ['bachelors', 'masters'],
        graduation_year: 2018,
        gpa: 3.7,
        enrollment_status: 'graduated',
        degree_level: 'graduate',
        major_field: 'computer_science',
        transcripts_verified: true,
        honors_received: ['magna_cum_laude']
      }
    };

    writeFileSync(testVaultPath, JSON.stringify(comprehensiveVault, null, 2));

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

  test('should handle multi-domain identity verification', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:comprehensive-verifier.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: {
          'and': [
            { '>=': [{ var: 'age' }, 25] },
            { '==': [{ var: 'citizenship' }, 'US'] },
            { '==': [{ var: 'has_passport' }, true] },
            { '==': [{ var: 'email_verified' }, true] }
          ]
        }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
    assert.strictEqual(response.proof.type, 'signature');
  });

  test('should handle complex financial verification', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:premium-bank.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:financial:v1',
        expr: {
          'and': [
            { '>=': [{ var: 'annual_income' }, 80000] },
            { '>=': [{ var: 'credit_score' }, 700] },
            { '<=': [{ var: 'debt_to_income_ratio' }, 0.3] },
            { '>=': [{ var: 'employment_duration_months' }, 24] },
            { '==': [{ var: 'has_bank_account' }, true] }
          ]
        }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should handle health verification for research', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:medical-research.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:health:v1',
        expr: {
          'and': [
            { 'in': ['COVID-19', { var: 'vaccinations_completed' }] },
            { '>=': [{ var: 'covid_vaccination_doses' }, 2] },
            { '!': [{ var: 'pregnant' }] },
            { '!': [{ var: 'recent_surgery_90_days' }] },
            { '==': [{ var: 'insurance_verified' }, true] }
          ]
        }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should handle system reliability verification', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:enterprise-client.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:metrics:v1',
        expr: {
          'and': [
            { '>=': [{ var: 'uptime_percentage_7d' }, 99.5] },
            { '<=': [{ var: 'response_time_p95_ms' }, 200] },
            { '<=': [{ var: 'error_rate_percentage' }, 0.1] },
            { '>=': [{ var: 'throughput_rps' }, 100] },
            { '==': [{ var: 'health_status' }, 'healthy'] }
          ]
        }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should handle academic verification for job application', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:tech-company.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:academic:v1',
        expr: {
          'and': [
            { 'in': ['bachelors', { var: 'degrees_earned' }] },
            { '>=': [{ var: 'gpa' }, 3.5] },
            { '==': [{ var: 'major_field' }, 'computer_science'] },
            { '==': [{ var: 'transcripts_verified' }, true] }
          ]
        }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should handle failing verification gracefully', async () => {
    const query: VQPQuery = {
      id: randomUUID(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:strict-verifier.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:financial:v1',
        expr: {
          'and': [
            { '>=': [{ var: 'annual_income' }, 150000] }, // Too high
            { '>=': [{ var: 'credit_score' }, 800] }       // Too high
          ]
        }
      }
    };

    const response = await vqpService.processQuery(query);

    assert.strictEqual(response.result, false);
    assert.ok(response.proof); // Should still be cryptographically signed
  });

  test('should handle sequential queries efficiently', async () => {
    const queries = [
      // Age verification
      new QueryBuilder()
        .id(randomUUID())
        .requester('did:web:sequence-test.com')
        .vocabulary('vqp:identity:v1')
        .expression({ '>=': [{ var: 'age' }, 18] })
        .build(),
      
      // Income verification
      new QueryBuilder()
        .id(randomUUID())
        .requester('did:web:sequence-test.com')
        .vocabulary('vqp:financial:v1')
        .expression({ '>=': [{ var: 'annual_income' }, 50000] })
        .build(),
      
      // Health verification
      new QueryBuilder()
        .id(randomUUID())
        .requester('did:web:sequence-test.com')
        .vocabulary('vqp:health:v1')
        .expression({ 'in': ['COVID-19', { var: 'vaccinations_completed' }] })
        .build()
    ];

    const responses: VQPResponse[] = [];
    
    for (const query of queries) {
      const response = await vqpService.processQuery(query);
      responses.push(response);
    }

    // All queries should succeed
    assert.strictEqual(responses.length, 3);
    responses.forEach((response, index) => {
      assert.strictEqual(response.result, true);
      assert.ok(response.proof);
      assert.strictEqual(response.queryId, queries[index].id);
    });
  });

  test('should handle parallel queries correctly', async () => {
    const queries = [
      new QueryBuilder()
        .id(randomUUID())
        .requester('did:web:parallel-test.com')
        .vocabulary('vqp:identity:v1')
        .expression({ '==': [{ var: 'citizenship' }, 'US'] })
        .build(),
      
      new QueryBuilder()
        .id(randomUUID())
        .requester('did:web:parallel-test.com')
        .vocabulary('vqp:metrics:v1')
        .expression({ '>=': [{ var: 'uptime_percentage_24h' }, 99.0] })
        .build(),
      
      new QueryBuilder()
        .id(randomUUID())
        .requester('did:web:parallel-test.com')
        .vocabulary('vqp:academic:v1')
        .expression({ 'in': ['masters', { var: 'degrees_earned' }] })
        .build()
    ];

    // Execute queries in parallel
    const responses = await Promise.all(
      queries.map(query => vqpService.processQuery(query))
    );

    // All queries should succeed
    assert.strictEqual(responses.length, 3);
    responses.forEach((response, index) => {
      assert.strictEqual(response.result, true);
      assert.ok(response.proof);
      assert.strictEqual(response.queryId, queries[index].id);
    });
  });

  test('should handle system queries with QueryBuilder', async () => {
    const systemQuery = new QueryBuilder()
      .id(randomUUID())
      .requester('did:web:test-requester')
      .target('did:web:test-target')
      .vocabulary('vqp:metrics:v1') // Changed from vqp:system:v1
      .expression({
        and: [
          { '>=': [{ var: 'uptime_percentage_24h' }, 99.9] },
          { '<=': [{ var: 'cpu_usage_percentage' }, 75] },
          { '==': [{ var: 'health_status' }, 'healthy'] },
        ],
      })
      .build();

    const response = await vqpService.processQuery(systemQuery);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should handle system queries with QueryBuilder - multiple conditions', async () => {
    const systemQuery2 = new QueryBuilder()
      .id(randomUUID())
      .requester('did:web:test-requester')
      .target('did:web:test-target')
      .vocabulary('vqp:metrics:v1') // Changed from vqp:system:v1
      .expression({
        and: [
          { '>=': [{ var: 'memory_usage_percentage' }, 50] },
          { '<=': [{ var: 'disk_usage_percentage' }, 90] },
        ],
      })
      .build();

    const response = await vqpService.processQuery(systemQuery2);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should handle system queries with QueryBuilder - single condition', async () => {
    const systemQuery3 = new QueryBuilder()
      .id(randomUUID())
      .requester('did:web:test-requester')
      .target('did:web:test-target')
      .vocabulary('vqp:metrics:v1') // Changed from vqp:system:v1
      .expression({
        '>=': [{ var: 'processed_events_last_hour' }, 1000]
      })
      .build();

    const response = await vqpService.processQuery(systemQuery3);

    assert.strictEqual(response.result, true);
    assert.ok(response.proof);
  });

  test('should handle system queries with QueryBuilder - invalid property', async () => {
    const systemQuery4_invalid_vocab_prop = new QueryBuilder()
      .id(randomUUID())
      .requester('did:web:test-requester')
      .target('did:web:test-target')
      .vocabulary('vqp:metrics:v1') // Changed from vqp:system:v1
      .expression({
        '>=': [{ var: 'non_existent_system_prop' }, 1000]
      })
      .build();

    const response = await vqpService.processQuery(systemQuery4_invalid_vocab_prop);

    assert.strictEqual(response.result, false);
    assert.ok(response.proof);
  });
});
