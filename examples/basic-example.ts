/**
 * Basic VQP Example - Demonstrates the complete VQP system in action
 * This example shows how to start a VQP responder and process queries
 */

import { createVQPSystem } from '../lib/vqp-system.js';

async function main() {
  try {
    console.log('🎯 VQP Basic Example Starting...\n');

    // Create and start VQP system
    const vqpSystem = createVQPSystem({
      transport: {
        type: 'http',
        port: 8080
      },
      data: {
        type: 'filesystem',
        vaultPath: './examples/sample-vault.json',
        policiesPath: './examples/access-policies.json'
      },
      crypto: {
        type: 'software'
      },
      vocabulary: {
        type: 'http',
        allowedVocabularies: ['vqp:identity:v1', 'vqp:metrics:v1']
      },
      audit: {
        type: 'console',
        logLevel: 'info'
      }
    });

    // Start the system
    await vqpSystem.start();

    // Get the VQP service for direct queries
    const vqpService = vqpSystem.getService();

    // Test queries
    const testQueries = [
      {
        id: generateUUID(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:example:test-querier',
        query: {
          lang: 'jsonlogic@1.0.0' as const,
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 18] }
        }
      },
      {
        id: generateUUID(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:example:test-querier',
        query: {
          lang: 'jsonlogic@1.0.0' as const,
          vocab: 'vqp:identity:v1',
          expr: { '==': [{ 'var': 'citizenship' }, 'US'] }
        }
      },
      {
        id: generateUUID(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:example:test-querier',
        query: {
          lang: 'jsonlogic@1.0.0' as const,
          vocab: 'vqp:identity:v1',
          expr: { 
            'and': [
              { '>=': [{ 'var': 'age' }, 21] },
              { '==': [{ 'var': 'has_drivers_license' }, true] }
            ]
          }
        }
      }
    ];

    console.log('📋 Testing VQP Queries:');
    console.log('');

    // Test each query
    for (const [index, query] of testQueries.entries()) {
      console.log(`Query ${index + 1}: ${JSON.stringify(query.query.expr)}`);
      
      try {
        const response = await vqpService.processQuery(query);
        console.log(`   ✅ Result: ${response.result}`);
        console.log(`   🔐 Proof: ${response.proof.type}`);
        console.log(`   ⏱️  Processed at: ${response.timestamp}`);
        console.log('');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Error: ${errorMessage}`);
        console.log('');
      }
    }

    console.log('🌐 HTTP Server running on http://localhost:8080');
    console.log('');
    console.log('Try this HTTP request:');
    console.log('');
    console.log('curl -X POST http://localhost:8080/vqp/query \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{');
    console.log('    "id": "' + generateUUID() + '",');
    console.log('    "version": "1.0.0",');
    console.log('    "timestamp": "' + new Date().toISOString() + '",');
    console.log('    "requester": "did:example:test-client",');
    console.log('    "query": {');
    console.log('      "lang": "jsonlogic@1.0.0",');
    console.log('      "vocab": "vqp:identity:v1",');
    console.log('      "expr": { ">=": [{ "var": "age" }, 18] }');
    console.log('    }');
    console.log('  }\'');
    console.log('');
    console.log('Press Ctrl+C to stop the server...');

    // Keep the server running
    await new Promise(() => {}); // Run indefinitely

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Example failed:', errorMessage);
    process.exit(1);
  }
}

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Run the example
if (require.main === module) {
  main().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Example failed:', errorMessage);
    process.exit(1);
  });
}
