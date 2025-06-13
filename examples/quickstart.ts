/**
 * VQP Quick Start Example
 * Demonstrates basic usage of the VQP library
 */

import { createVQPSystem, createVQPQuerier } from '../lib/vqp-system.js';
import { QueryBuilder } from '../lib/index.js';

async function quickStart() {
  console.log('🚀 VQP Quick Start Example');

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
    transport: {
      type: 'memory' // Cambiamos a memory para simplificar el ejemplo
    }
  });

  // 2. Start the system
  await vqpSystem.start();

  // 3. Create a querier to ask questions
  const querier = createVQPQuerier({
    identity: 'did:web:example-app.com'
  });

  // 4. Build and send a query
  const query = new QueryBuilder()
    .requester('did:web:example-app.com')
    .vocabulary('vqp:identity:v1')
    .expression({ '>=': [{ 'var': 'age' }, 18] })
    .build();

  // 5. For this example, we'll simulate a direct query using the system's service
  const vqpService = vqpSystem.getService();
  const response = await vqpService.processQuery(query);

  // 6. Verify the response
  const isValid = await querier.verify(response);
  
  if (isValid) {
    console.log('✅ Age verification passed:', response.result);
  } else {
    console.log('❌ Verification failed');
  }

  // 7. Stop the system
  await vqpSystem.stop();
}

// ES module main check
if (import.meta.url === `file://${process.argv[1]}`) {
  quickStart().catch(console.error);
}

export { quickStart };
