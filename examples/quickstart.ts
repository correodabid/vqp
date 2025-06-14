/**
 * VQP Quick Start Example - Simplified Approach
 * Demonstrates basic VQP usage without complex state management
 */

import { createVQPSystem } from '../lib/vqp-system.js';
import { QueryBuilder } from '../lib/domain/query-builder.js';
import { VQPVerifier } from '../lib/domain/vqp-verifier.js';
import { SoftwareCryptoAdapter } from '../lib/adapters/crypto/software-adapter.js';

async function quickStart() {
  console.log('🚀 VQP Quick Start Example - Simplified');

  // 1. Create a VQP responder system
  const vqpSystem = createVQPSystem({
    data: {
      type: 'filesystem',
      vaultPath: './examples/sample-vault.json'
    },
    crypto: {
      type: 'software'
    },
    vocabulary: {
      type: 'http',
      allowedVocabularies: ['vqp:identity:v1']
    },
    audit: {
      type: 'console'
    },
  });

  // 2. Build queries directly with QueryBuilder (no querier needed!)
  const requesterIdentity = 'did:web:example-app.com';
  
  const query = QueryBuilder.compare(
    requesterIdentity,
    'vqp:identity:v1',
    'age',
    '>=',
    18
  );

  // 3. Process query directly with VQP service
  const vqpService = vqpSystem.getService();
  const response = await vqpService.processQuery(query);

  // 4. Verify response directly (no querier state needed)
  const crypto = new SoftwareCryptoAdapter();
  const verifier = new VQPVerifier(crypto);
  const isValid = await verifier.verifyComplete(response, query.id);
  
  if (isValid.overall) {
    console.log('✅ Age verification passed:', response.result);
  } else {
    console.log('❌ Verification failed');
  }
}

// ES module main check
if (import.meta.url === `file://${process.argv[1]}`) {
  quickStart().catch(console.error);
}

export { quickStart };
