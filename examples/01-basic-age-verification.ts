/**
 * VQP Example 1: Basic Age Verification
 *
 * Demonstrates the most common VQP use case:
 * - Verify someone is over 18 without revealing their actual age
 * - Uses modular @vqp packages
 * - Shows complete flow: query → evaluation → response → verification
 */

import { VQPService, QueryBuilder, createResponseModeAdapter } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

// Standard identity vocabulary
const IDENTITY_VOCAB = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Identity Vocabulary',
  type: 'object',
  properties: {
    age: { type: 'integer', minimum: 0, maximum: 150 },
    citizenship: { type: 'string', pattern: '^[A-Z]{2}$' },
  },
};

async function main() {
  console.log('🎯 VQP Example: Age Verification');

  // 1. Setup VQP responder (person with data)
  const responder = new VQPService(
    await createFileSystemDataAdapter({
      vaultPath: './examples/sample-vault.json',
    }),
    await createSoftwareCryptoAdapter(),
    await createConsoleAuditAdapter(),
    await createJSONLogicAdapter(),
    createResponseModeAdapter({
      autoConsent: true,
      defaultMode: 'strict',
    })
  );

  // 2. Build age verification query
  const query = new QueryBuilder()
    .requester('did:web:streaming-service.com')
    .vocabulary('vqp:identity:v1')
    .expression({
      '>=': [{ var: 'age' }, 18],
    })
    .build();

  console.log('📤 Query:', JSON.stringify(query, null, 2));

  // 3. Process query (with vocabulary provided)
  const response = await responder.processQuery(query, {
    'vqp:identity:v1': IDENTITY_VOCAB,
  });

  console.log('📥 Response:', JSON.stringify(response, null, 2));

  // 4. Verify response signature
  const crypto = await createSoftwareCryptoAdapter();
  const isValid = await crypto.verify(
    response.proof,
    Buffer.from(
      JSON.stringify({
        queryId: response.queryId,
        result: response.result,
        timestamp: response.timestamp,
        responder: response.responder,
      })
    ),
    // For signature proofs, extract the public key
    'publicKey' in response.proof ? response.proof.publicKey : 'default-public-key'
  );

  console.log('✅ Signature Valid:', isValid);
  console.log('🎉 Person is over 18:', response.result);
}

// Run the example
main().catch(console.error);
