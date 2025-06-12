/**
 * Comprehensive VQP Flow Tests
 * Demonstrates the complete VQP protocol working with multiple vocabularies and query types
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { VQPSystem } from '../../lib/vqp-system.js';
import { VQPQuery, VQPResponse } from '../../lib/domain/types.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('VQP Comprehensive Flow Tests', () => {
  let vqpSystem: VQPSystem;
  let testVaultPath: string;

  beforeEach(async () => {
    // Create comprehensive test vault with multiple data domains
    testVaultPath = join(process.cwd(), 'comprehensive-test-vault.json');

    const comprehensiveVault = {
      personal: {
        age: 32,
        citizenship: 'US',
        has_drivers_license: true,
        has_passport: true,
        government_id_verified: true,
        email_verified: true,
        phone_verified: true
      },
      financial: {
        annual_income: 95000,
        monthly_income: 7900,
        employment_status: 'employed',
        employment_duration_months: 36,
        credit_score: 750,
        has_bank_account: true,
        debt_to_income_ratio: 0.25,
        tax_resident_country: 'US'
      },
      system: {
        uptime_percentage_24h: 99.9,
        uptime_percentage_7d: 99.8,
        response_time_p95_ms: 120,
        error_rate_percentage: 0.02,
        throughput_rps: 850,
        cpu_usage_percentage: 45.5,
        memory_usage_percentage: 62.0,
        health_status: 'healthy'
      }
    };

    writeFileSync(testVaultPath, JSON.stringify(comprehensiveVault, null, 2));

    // Initialize VQP system
    vqpSystem = new VQPSystem({
      data: {
        type: 'filesystem',
        vaultPath: testVaultPath
      },
      crypto: {
        type: 'software'
      },
      vocabulary: {
        type: 'http',
        allowedVocabularies: ['vqp:identity:v1', 'vqp:financial:v1', 'vqp:metrics:v1'],
        cacheTimeoutMs: 300000
      },
      audit: {
        type: 'console',
        logLevel: 'info'
      },
      transport: {
        type: 'http',
        port: 3000
      }
    });
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testVaultPath)) unlinkSync(testVaultPath);
  });

  describe('Identity Verification Queries', () => {
    it('should verify age eligibility (18+)', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:age-verification-service.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 18] }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true); // 32 >= 18
      assert.strictEqual(response.queryId, query.id);
      assert.ok(response.proof);
      assert.strictEqual(response.proof.type, 'signature');
    });

    it('should verify age eligibility (21+)', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:alcohol-service.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 21] }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true); // 32 >= 21
    });

    it('should verify US citizenship and ID verification', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:government-service.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: {
            'and': [
              { '==': [{ 'var': 'citizenship' }, 'US'] },
              { '==': [{ 'var': 'government_id_verified' }, true] }
            ]
          }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true);
    });

    it('should verify comprehensive identity requirements', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:comprehensive-kyc.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: {
            'and': [
              { '>=': [{ 'var': 'age' }, 25] },
              { '==': [{ 'var': 'citizenship' }, 'US'] },
              { '==': [{ 'var': 'has_drivers_license' }, true] },
              { '==': [{ 'var': 'email_verified' }, true] },
              { '==': [{ 'var': 'phone_verified' }, true] }
            ]
          }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true);
    });
  });

  describe('Financial Verification Queries', () => {
    it('should verify loan eligibility (income-based)', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:bank.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:financial:v1',
          expr: { '>=': [{ 'var': 'annual_income' }, 50000] }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true); // 95000 >= 50000
    });

    it('should verify comprehensive loan eligibility', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:mortgage-lender.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:financial:v1',
          expr: {
            'and': [
              { '>=': [{ 'var': 'annual_income' }, 80000] },
              { '>=': [{ 'var': 'credit_score' }, 700] },
              { '==': [{ 'var': 'employment_status' }, 'employed'] },
              { '>=': [{ 'var': 'employment_duration_months' }, 24] },
              { '<=': [{ 'var': 'debt_to_income_ratio' }, 0.36] }
            ]
          }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true);
    });

    it('should verify high-income threshold', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:premium-service.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:financial:v1',
          expr: { '>=': [{ 'var': 'annual_income' }, 100000] }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, false); // 95000 < 100000
    });
  });

  describe('System Metrics Verification Queries', () => {
    it('should verify SLA compliance', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:monitoring-service.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:metrics:v1',
          expr: {
            'and': [
              { '>=': [{ 'var': 'uptime_percentage_24h' }, 99.5] },
              { '<=': [{ 'var': 'response_time_p95_ms' }, 200] },
              { '<=': [{ 'var': 'error_rate_percentage' }, 0.1] }
            ]
          }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true);
    });

    it('should verify resource health', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:resource-monitor.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:metrics:v1',
          expr: {
            'and': [
              { '<=': [{ 'var': 'cpu_usage_percentage' }, 80] },
              { '<=': [{ 'var': 'memory_usage_percentage' }, 85] },
              { '==': [{ 'var': 'health_status' }, 'healthy'] }
            ]
          }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true);
    });

    it('should verify high-performance requirements', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:performance-checker.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:metrics:v1',
          expr: {
            'and': [
              { '>=': [{ 'var': 'throughput_rps' }, 1000] },
              { '<=': [{ 'var': 'response_time_p95_ms' }, 100] }
            ]
          }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, false); // throughput 850 < 1000
    });
  });

  describe('Complex Cross-Domain Queries', () => {
    it('should handle complex boolean logic with multiple conditions', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:complex-service.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: {
            'or': [
              {
                'and': [
                  { '>=': [{ 'var': 'age' }, 30] },
                  { '==': [{ 'var': 'has_passport' }, true] }
                ]
              },
              {
                'and': [
                  { '>=': [{ 'var': 'age' }, 25] },
                  { '==': [{ 'var': 'government_id_verified' }, true] },
                  { '==': [{ 'var': 'email_verified' }, true] }
                ]
              }
            ]
          }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      assert.strictEqual(response.result, true); // First condition matches: age 32 >= 30 AND has_passport true
    });
  });

  describe('Response Verification', () => {
    it('should verify all generated responses', async () => {
      const queries = [
        {
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 18] }
        },
        {
          vocab: 'vqp:financial:v1',
          expr: { '>=': [{ 'var': 'annual_income' }, 50000] }
        },
        {
          vocab: 'vqp:metrics:v1',
          expr: { '==': [{ 'var': 'health_status' }, 'healthy'] }
        }
      ];

      for (const queryConfig of queries) {
        const query: VQPQuery = {
          id: uuidv4(),
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          requester: 'did:web:verification-test.com',
          query: {
            lang: 'jsonlogic@1.0.0',
            vocab: queryConfig.vocab,
            expr: queryConfig.expr
          }
        };

        const response = await vqpSystem.getService().processQuery(query);
        const isValid = await vqpSystem.verify(response);

        assert.strictEqual(isValid, true, `Response verification failed for ${queryConfig.vocab}`);
        assert.strictEqual(response.result, true, `Query result was false for ${queryConfig.vocab}`);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid query structures', async () => {
      const invalidQuery = {
        id: 'not-a-uuid',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:test.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 18] }
        }
      };

      try {
        await vqpSystem.getService().processQuery(invalidQuery as any);
        assert.fail('Should have thrown an error for invalid query ID');
      } catch (error: any) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Invalid query ID'));
      }
    });

    it('should handle queries for non-existent data', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:test.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: { '==': [{ 'var': 'non_existent_field' }, 'value'] }
        }
      };

      const response = await vqpSystem.getService().processQuery(query);

      // JSONLogic should handle undefined values gracefully
      assert.strictEqual(response.result, false);
      assert.ok(response.proof);
    });
  });

  describe('Performance and Timing', () => {
    it('should process queries within reasonable time limits', async () => {
      const query: VQPQuery = {
        id: uuidv4(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:web:performance-test.com',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 18] }
        }
      };

      const startTime = Date.now();
      const response = await vqpSystem.getService().processQuery(query);
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      assert.strictEqual(response.result, true);
      assert.ok(processingTime < 1000, `Processing took ${processingTime}ms, should be under 1000ms`);
    });
  });
});
