/**
 * VQP System Configuration Example with MemoryAuditAdapter
 */

import { VQPSystem, VQPSystemConfig } from '../lib/vqp-system.js';
import { MemoryAuditAdapter } from '../lib/adapters/audit/memory-adapter.js';

async function demonstrateVQPSystemWithMemoryAudit() {
  console.log('🚀 VQP System with MemoryAuditAdapter Demo\n');

  // Create the VQP system configuration with MemoryAuditAdapter
  const config: VQPSystemConfig = {
    data: {
      type: 'filesystem',
      vaultPath: '/tmp/vqp-vault.json',
      policiesPath: '/tmp/vqp-policies.json'
    },
    crypto: {
      type: 'software'
      // Let it generate keys automatically for demo
    },
    vocabulary: {
      type: 'http',
      allowedVocabularies: ['vqp:identity:v1', 'vqp:metrics:v1'],
      cacheTimeoutMs: 300000
    },
    audit: {
      type: 'memory',
      maxEntries: 1000,
      includeFullQuery: true,
      includeFullResponse: false,
      autoCleanup: true
    },
    transport: {
      type: 'http',
      port: 8080,
      corsOrigins: ['*'],
      rateLimitWindowMs: 60000,
      rateLimitMax: 100
    }
  };

  // Create the VQP system
  const vqpSystem = new VQPSystem(config);

  console.log('✅ VQP System created successfully');

  // Create a sample query
  const query = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    version: '1.0.0' as const,
    timestamp: new Date().toISOString(),
    requester: 'did:web:demo-app.com',
    target: 'did:web:personal-vault.com',
    query: {
      lang: 'jsonlogic@1.0.0' as const,
      vocab: 'vqp:identity:v1',
      expr: { '>=': [{ 'var': 'age' }, 18] }
    }
  };

  console.log('📝 Creating sample vault data...');
  // Create a simple vault file for demo
  const fs = await import('fs');
  const vaultData = {
    personal: {
      age: 25,
      citizenship: 'US',
      has_drivers_license: true
    }
  };
  
  fs.writeFileSync('/tmp/vqp-vault.json', JSON.stringify(vaultData, null, 2));
  console.log('✅ Vault data created');

  console.log('📝 Simulating query processing...');
  try {
    // For demo purposes, we'll manually create a response since we don't have full query processing
    const mockResponse = {
      queryId: query.id,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      responder: 'did:web:personal-vault.com',
      result: true as const,
      proof: {
        type: 'signature' as const,
        algorithm: 'ed25519' as const,
        publicKey: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        signature: '0x304402207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a002207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0'
      }
    };

    // Access the memory audit adapter to log manually for demo
    const auditAdapter = vqpSystem.getAuditAdapter();
    
    if (auditAdapter instanceof MemoryAuditAdapter) {
      console.log('✅ Found MemoryAuditAdapter in system');
      
      // Log the query manually for demo
      await auditAdapter.logQuery(query, mockResponse);
      console.log('✅ Query logged to memory audit');
      
      console.log('\n📊 Memory Audit Statistics:');
      const stats = auditAdapter.getMemoryStats();
      console.log(`   - Total entries: ${stats.entryCount}`);
      console.log(`   - Max entries: ${stats.maxEntries}`);
      console.log(`   - Memory usage: ${stats.memoryUsageBytes} bytes`);
      
      console.log('\n📋 Recent audit entries:');
      const recentEntries = auditAdapter.getRecentEntries(5);
      recentEntries.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.event} at ${entry.timestamp}`);
        if (entry.queryId) console.log(`      Query ID: ${entry.queryId.substring(0, 8)}...`);
        if (entry.result !== undefined) console.log(`      Result: ${entry.result}`);
      });

      console.log('\n🔍 Searching for identity-related entries:');
      const identityEntries = auditAdapter.searchEntries('identity');
      console.log(`   Found ${identityEntries.length} entries`);
      
      console.log('\n📋 Full audit trail:');
      const auditTrail = await auditAdapter.getAuditTrail();
      auditTrail.forEach((entry, index) => {
        console.log(`   ${index + 1}. Event: ${entry.event}`);
        console.log(`      Timestamp: ${entry.timestamp}`);
        if (entry.queryId) console.log(`      Query ID: ${entry.queryId}`);
        if (entry.querier) console.log(`      Querier: ${entry.querier}`);
        if (entry.result !== undefined) console.log(`      Result: ${entry.result}`);
        console.log();
      });
    }

  } catch (error) {
    console.log('❌ Query processing failed:', (error as Error).message);
  }

  console.log('\n✅ Demo completed successfully!');
  
  // Cleanup
  try {
    const fs = await import('fs');
    fs.unlinkSync('/tmp/vqp-vault.json');
    console.log('🧹 Cleaned up demo files');
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run the demo
demonstrateVQPSystemWithMemoryAudit().catch(console.error);
