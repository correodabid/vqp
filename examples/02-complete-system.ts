/**
 * VQP Example 2: Complete System Integration
 *
 * Shows how to integrate VQP into a real application:
 * - HTTP server with VQP endpoints
 * - Multiple vocabulary support
 * - Error handling and validation
 * - Audit logging
 */

import {
  VQPService,
  QueryBuilder,
  type VQPQuery,
  type VQPResponse,
  createResponseModeAdapter,
} from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createFileAuditAdapter } from '@vqp/audit-file';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

// Standard vocabularies
const VOCABULARIES = {
  'vqp:identity:v1': {
    type: 'object',
    properties: {
      age: { type: 'integer', minimum: 0 },
      citizenship: { type: 'string', pattern: '^[A-Z]{2}$' },
      has_drivers_license: { type: 'boolean' },
    },
  },
  'vqp:financial:v1': {
    type: 'object',
    properties: {
      annual_income: { type: 'integer', minimum: 0 },
      employment_status: {
        type: 'string',
        enum: ['employed', 'self_employed', 'unemployed', 'retired'],
      },
      credit_score: { type: 'integer', minimum: 300, maximum: 850 },
    },
  },
};

class VQPServer {
  private vqpService: VQPService;

  constructor(vqpService: VQPService) {
    this.vqpService = vqpService;
  }

  async handleQuery(query: VQPQuery): Promise<VQPResponse> {
    try {
      // Validate query structure
      this.validateQuery(query);

      // Check if vocabulary is supported
      if (!VOCABULARIES[query.query.vocab]) {
        throw new Error(`Unsupported vocabulary: ${query.query.vocab}`);
      }

      // Process query with vocabulary
      const response = await this.vqpService.processQuery(query, {
        [query.query.vocab]: VOCABULARIES[query.query.vocab],
      });

      return response;
    } catch (error) {
      throw new Error(`Query processing failed: ${error.message}`);
    }
  }

  private validateQuery(query: VQPQuery): void {
    if (!query.id || !query.version || !query.timestamp || !query.query) {
      throw new Error('Invalid query structure');
    }

    if (!query.query.lang || !query.query.vocab || !query.query.expr) {
      throw new Error('Invalid query.query structure');
    }

    if (query.query.lang !== 'jsonlogic@1.0.0') {
      throw new Error('Unsupported query language');
    }
  }
}

async function main() {
  console.log('🏢 VQP Example: Complete System');

  // Initialize VQP service with file audit
  const vqpService = new VQPService(
    await createFileSystemDataAdapter({
      vaultPath: './examples/sample-vault.json',
    }),
    await createSoftwareCryptoAdapter(),
    await createFileAuditAdapter({
      logDirectory: './logs',
    }),
    await createJSONLogicAdapter(),
    createResponseModeAdapter({
      autoConsent: true,
      defaultMode: 'strict',
    })
  );

  const server = new VQPServer(vqpService);

  // Example queries
  const queries = [
    // Age verification
    new QueryBuilder()
      .requester('did:web:age-verification-service.com')
      .vocabulary('vqp:identity:v1')
      .expression({ '>=': [{ var: 'age' }, 21] })
      .build(),

    // Income verification
    new QueryBuilder()
      .requester('did:web:loan-application.com')
      .vocabulary('vqp:financial:v1')
      .expression({
        and: [
          { '>=': [{ var: 'annual_income' }, 50000] },
          { '==': [{ var: 'employment_status' }, 'employed'] },
        ],
      })
      .build(),

    // Credit check
    new QueryBuilder()
      .requester('did:web:credit-service.com')
      .vocabulary('vqp:financial:v1')
      .expression({ '>=': [{ var: 'credit_score' }, 650] })
      .build(),
  ];

  // Process all queries
  for (const [index, query] of queries.entries()) {
    try {
      console.log(`\n📤 Query ${index + 1}:`, query.query.expr);

      const response = await server.handleQuery(query);

      console.log(`📥 Response ${index + 1}:`, {
        result: response.result,
        verified: response.proof.type === 'signature' && 'signature' in response.proof,
      });
    } catch (error) {
      console.error(`❌ Query ${index + 1} failed:`, error.message);
    }
  }

  console.log('\n✅ All queries processed - check vqp-audit.log for details');
}

// Run the example
main().catch(console.error);
