/**
 * VQP Example 5: Custom Adapter Development
 *
 * Shows how to create custom adapters following VQP patterns:
 * - Custom data adapter (API-based)
 * - Custom audit adapter (webhook)
 * - Hexagonal architecture principles
 * - Proper error handling and testing
 */

import { randomUUID } from 'node:crypto';
import { VQPService, QueryBuilder, createResponseModeAdapter, VocabularyPort } from '@vqp/core';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';
import type { DataAccessPort, AuditPort, AuditEntry, AuditFilters } from '@vqp/core';

// Custom API-based data adapter
class APIDataAdapter implements DataAccessPort {
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(config: { apiBaseUrl: string; apiKey: string }) {
    this.apiBaseUrl = config.apiBaseUrl;
    this.apiKey = config.apiKey;
  }

  async getData(path: string[]): Promise<any> {
    try {
      // Simulate API call to external data source
      const endpoint = `${this.apiBaseUrl}/data/${path.join('/')}`;

      // In real implementation, you'd use fetch() or axios
      console.log(`🌐 Fetching data from: ${endpoint}`);

      // Mock API response based on path
      const mockApiData = {
        'user/profile/age': 28,
        'user/profile/verified': true,
        'user/financial/income': 75000,
        'user/financial/credit_score': 720,
        'company/metrics/uptime': 99.9,
        'company/metrics/response_time': 120,
      };

      const key = path.join('/');
      return mockApiData[key] ?? null;
    } catch (error) {
      throw new Error(`API data fetch failed: ${error.message}`);
    }
  }

  async validateDataAccess(path: string[], requester: string): Promise<boolean> {
    // Implement API-based access control
    try {
      console.log(`🔒 Validating access for ${requester} to ${path.join('/')}`);

      // Mock access control rules
      const accessRules = {
        'did:web:trusted-service.com': ['user/profile', 'user/financial'],
        'did:web:monitoring-service.com': ['company/metrics'],
        'did:web:public-service.com': ['user/profile/verified'],
      };

      const allowedPaths = accessRules[requester] || [];
      const requestedPath = path.join('/');

      return allowedPaths.some((allowed) => requestedPath.startsWith(allowed));
    } catch (error) {
      console.error('Access validation failed:', error.message);
      return false;
    }
  }

  async hasData(path: string[]): Promise<boolean> {
    // Check if data exists at the given path
    const key = path.join('/');
    const mockApiData = {
      'user/profile/age': 28,
      'user/profile/verified': true,
      'user/financial/income': 75000,
      'user/financial/credit_score': 720,
      'company/metrics/uptime': 99.9,
      'company/metrics/response_time': 120,
    };
    return key in mockApiData;
  }
}

// Custom webhook audit adapter
class WebhookAuditAdapter implements AuditPort {
  private webhookUrl: string;
  private auditHistory: AuditEntry[] = [];

  constructor(config: { webhookUrl: string }) {
    this.webhookUrl = config.webhookUrl;
  }

  async logQuery(query: any, response: any): Promise<void> {
    const auditEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event: 'query_processed',
      queryId: query.id,
      querier: query.requester,
      result: response.result,
      metadata: {
        vocabulary: query.query.vocab,
        proofType: response.proof.type,
      },
    };

    this.auditHistory.push(auditEntry);

    try {
      // Simulate webhook call
      console.log(`📡 Sending audit to webhook: ${this.webhookUrl}`);
      console.log(`   Entry: ${auditEntry.event} - ${auditEntry.result}`);

      // In real implementation:
      // await fetch(this.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(auditEntry)
      // });
    } catch (error) {
      console.error('Webhook audit failed:', error.message);
      // Don't throw - audit failures shouldn't break query processing
    }
  }

  async logError(error: Error, context: any): Promise<void> {
    const auditEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event: 'error_occurred',
      error: {
        code: 'EVALUATION_ERROR',
        message: error.message,
        name: 'EvaluationError',
      },
      metadata: {
        context: context,
      },
    };

    this.auditHistory.push(auditEntry);

    try {
      console.log(`📡 Sending error audit to webhook: ${this.webhookUrl}`);
      console.log(`   Error: ${error.message}`);
    } catch (webhookError) {
      console.error('Webhook error audit failed:', webhookError.message);
    }
  }

  async getAuditTrail(filters: AuditFilters = {}): Promise<AuditEntry[]> {
    let filtered = this.auditHistory;

    if (filters.startTime) {
      filtered = filtered.filter((entry) => entry.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      filtered = filtered.filter((entry) => entry.timestamp <= filters.endTime!);
    }

    if (filters.event) {
      filtered = filtered.filter((entry) => entry.event === filters.event);
    }

    return filtered;
  }

  async purgeOldEntries(olderThan: string): Promise<number> {
    const initialCount = this.auditHistory.length;
    this.auditHistory = this.auditHistory.filter((entry) => entry.timestamp >= olderThan);
    return initialCount - this.auditHistory.length;
  }
}

// Factory functions (following VQP patterns)
export async function createAPIDataAdapter(config: {
  apiBaseUrl: string;
  apiKey: string;
}): Promise<APIDataAdapter> {
  return new APIDataAdapter(config);
}

export function createWebhookAuditAdapter(config: { webhookUrl: string }): WebhookAuditAdapter {
  return new WebhookAuditAdapter(config);
}

const CUSTOM_VOCAB = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            age: { type: 'integer' },
            verified: { type: 'boolean' },
          },
        },
        financial: {
          type: 'object',
          properties: {
            income: { type: 'integer' },
            credit_score: { type: 'integer' },
          },
        },
      },
    },
    company: {
      type: 'object',
      properties: {
        metrics: {
          type: 'object',
          properties: {
            uptime: { type: 'number' },
            response_time: { type: 'number' },
          },
        },
      },
    },
  },
};

// Simple vocabulary adapter for this example
class CustomVocabularyAdapter implements VocabularyPort {
  async resolveVocabulary(uri: string): Promise<any> {
    if (uri === 'custom:api:v1') {
      return CUSTOM_VOCAB;
    }
    throw new Error(`Unknown vocabulary: ${uri}`);
  }

  async validateAgainstVocabulary(data: any, vocabulary: any): Promise<boolean> {
    return true; // Simplified validation
  }

  async cacheVocabulary(uri: string, schema: any): Promise<void> {
    // No-op for this example
  }

  async isVocabularyAllowed(uri: string): Promise<boolean> {
    return uri === 'custom:api:v1';
  }
}

async function main() {
  console.log('🔧 VQP Example: Custom Adapters');

  // Create adapters separately so we can access them later
  const apiDataAdapter = await createAPIDataAdapter({
    apiBaseUrl: 'https://api.example.com',
    apiKey: 'secret-api-key',
  });

  const webhookAuditAdapter = createWebhookAuditAdapter({
    webhookUrl: 'https://audit.example.com/webhook',
  });

  // Initialize VQP with custom adapters
  const vqpService = new VQPService(
    apiDataAdapter,
    await createSoftwareCryptoAdapter(),
    webhookAuditAdapter,
    await createJSONLogicAdapter(),
    createResponseModeAdapter({
      autoConsent: true,
      defaultMode: 'strict',
    }),
    new CustomVocabularyAdapter()
  );

  // Test queries demonstrating custom adapter capabilities
  const queries = [
    // User verification
    {
      name: 'User Age & Verification',
      query: new QueryBuilder()
        .requester('did:web:trusted-service.com')
        .vocabulary('custom:api:v1')
        .expression({
          and: [
            { '>=': [{ var: 'user.profile.age' }, 21] },
            { '==': [{ var: 'user.profile.verified' }, true] },
          ],
        })
        .build(),
    },

    // Financial check
    {
      name: 'Financial Qualification',
      query: new QueryBuilder()
        .requester('did:web:trusted-service.com')
        .vocabulary('custom:api:v1')
        .expression({
          and: [
            { '>=': [{ var: 'user.financial.income' }, 50000] },
            { '>=': [{ var: 'user.financial.credit_score' }, 650] },
          ],
        })
        .build(),
    },

    // System monitoring
    {
      name: 'System Health',
      query: new QueryBuilder()
        .requester('did:web:monitoring-service.com')
        .vocabulary('custom:api:v1')
        .expression({
          and: [
            { '>=': [{ var: 'company.metrics.uptime' }, 99.5] },
            { '<=': [{ var: 'company.metrics.response_time' }, 200] },
          ],
        })
        .build(),
    },

    // Unauthorized access attempt
    {
      name: 'Unauthorized Access',
      query: new QueryBuilder()
        .requester('did:web:untrusted-service.com') // Not in access rules
        .vocabulary('custom:api:v1')
        .expression({ var: 'user.financial.income' })
        .build(),
    },
  ];

  // Process all queries
  for (const { name, query } of queries) {
    try {
      console.log(`\n🔍 Processing: ${name}`);

      const response = await vqpService.processQuery(query, {
        'custom:api:v1': CUSTOM_VOCAB,
      });

      console.log(`✅ Result: ${response.result}`);
      console.log(`🔐 Proof type: ${response.proof.type}`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  // Show audit trail from custom webhook adapter
  const auditTrail = await webhookAuditAdapter.getAuditTrail({});

  console.log(`\n📋 Audit trail: ${auditTrail.length} entries`);
  auditTrail.forEach((entry, index) => {
    console.log(`   ${index + 1}. ${entry.event} (${entry.result || 'error'})`);
  });

  console.log('\n🎉 Custom adapters demonstrate VQP extensibility!');
}

// Run the example
main().catch(console.error);
