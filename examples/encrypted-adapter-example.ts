/**
 * Example usage of EncryptedDataAdapter
 * This demonstrates how to use the encrypted data adapter in a real application
 */

import { EncryptedDataAdapter } from '../lib/adapters/data/encrypted-adapter.js';
import { VQPService } from '../lib/domain/vqp-service.js';
import { SoftwareCryptoAdapter } from '../lib/adapters/crypto/software-adapter.js';
import { HTTPVocabularyAdapter } from '../lib/adapters/vocabulary/http-adapter.js';
import { MemoryAuditAdapter } from '../lib/adapters/audit/memory-adapter.js';

async function main() {
  console.log('🔐 VQP Encrypted Data Adapter Example\n');

  // 1. Set up encrypted data adapter
  const encryptedDataAdapter = new EncryptedDataAdapter({
    vaultPath: './encrypted-vault.json',
    policiesPath: './examples/access-policies.json',
    encryptionKey: 'your-secure-master-key-change-in-production',
    keyDerivation: {
      iterations: 100000,  // Strong key derivation
      keyLength: 32        // AES-256
    },
    cacheEnabled: true
  });

  // 2. Sample sensitive data to encrypt
  const sensitiveData = {
    personal: {
      age: 28,
      citizenship: 'US',
      has_drivers_license: true,
      social_security_last_4: '1234'
    },
    financial: {
      annual_income: 75000,
      credit_score: 720,
      has_bank_account: true,
      employment_status: 'employed'
    },
    health: {
      vaccinations_completed: ['COVID-19', 'influenza'],
      has_health_insurance: true,
      recent_surgery_90_days: false
    },
    system: {
      uptime_percentage_24h: 99.8,
      processed_events_last_hour: 1250,
      error_rate_percentage: 0.05
    }
  };

  console.log('💾 Encrypting and saving sensitive data...');
  await encryptedDataAdapter.saveVault(sensitiveData);
  console.log('✅ Data encrypted and saved to vault\n');

  // 3. Set up other adapters
  const cryptoAdapter = new SoftwareCryptoAdapter();
  const vocabularyAdapter = new HTTPVocabularyAdapter();
  const auditAdapter = new MemoryAuditAdapter();

  // 4. Create VQP service with encrypted data
  const vqpService = new VQPService(
    encryptedDataAdapter,
    cryptoAdapter,
    vocabularyAdapter,
    auditAdapter
  );

  // 5. Example queries that work with encrypted data
  const queries = [
    {
      id: 'age-verification',
      query: {
        lang: 'jsonlogic@1.0.0' as const,
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ 'var': 'personal.age' }, 18] }
      },
      description: 'Verify age is 18 or older'
    },
    {
      id: 'income-verification',
      query: {
        lang: 'jsonlogic@1.0.0' as const,
        vocab: 'vqp:financial:v1',
        expr: { '>=': [{ 'var': 'financial.annual_income' }, 50000] }
      },
      description: 'Verify annual income is at least $50,000'
    },
    {
      id: 'health-check',
      query: {
        lang: 'jsonlogic@1.0.0' as const,
        vocab: 'vqp:health:v1',
        expr: { 'in': ['COVID-19', { 'var': 'health.vaccinations_completed' }] }
      },
      description: 'Verify COVID-19 vaccination'
    },
    {
      id: 'system-health',
      query: {
        lang: 'jsonlogic@1.0.0' as const,
        vocab: 'vqp:metrics:v1',
        expr: { '>=': [{ 'var': 'system.uptime_percentage_24h' }, 99.0] }
      },
      description: 'Verify system uptime is above 99%'
    }
  ];

  console.log('🔍 Testing queries against encrypted data:\n');

  for (const { id, query, description } of queries) {
    try {
      console.log(`📋 ${description}`);
      console.log(`   Query: ${JSON.stringify(query.expr)}`);

      // Create a full VQP query
      const vqpQuery = {
        id,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:example:test-service',
        query
      };

      // Process the query (data is decrypted transparently)
      const response = await vqpService.processQuery(vqpQuery);
      
      console.log(`   ✅ Result: ${response.result}`);
      console.log(`   🔏 Proof type: ${response.proof.type}`);
      console.log('');

    } catch (error) {
      console.log(`   ❌ Error: ${(error as Error).message}\n`);
    }
  }

  // 6. Demonstrate data access validation
  console.log('🔒 Testing access control:\n');

  const accessTests = [
    { path: ['personal', 'age'], requester: 'did:example:authorized-service', expected: true },
    { path: ['financial', 'credit_score'], requester: 'did:example:unauthorized-user', expected: false },
    { path: ['system', 'uptime_percentage_24h'], requester: 'did:example:monitoring-service', expected: true }
  ];

  for (const { path, requester, expected } of accessTests) {
    const canAccess = await encryptedDataAdapter.validateDataAccess(path, requester);
    const status = canAccess === expected ? '✅' : '❌';
    console.log(`${status} ${requester} accessing ${path.join('.')}: ${canAccess ? 'ALLOWED' : 'DENIED'}`);
  }

  console.log('\n🔄 Demonstrating key rotation:\n');

  // 7. Demonstrate key rotation
  console.log('🔑 Current encryption key in use...');
  const ageBeforeRotation = await encryptedDataAdapter.getData(['personal', 'age']);
  console.log(`   Age retrieved: ${ageBeforeRotation}`);

  console.log('🔄 Rotating encryption key...');
  await encryptedDataAdapter.rotateEncryptionKey('new-secure-master-key-after-rotation');
  console.log('✅ Key rotation completed');

  console.log('🔍 Verifying data accessibility with new key...');
  const ageAfterRotation = await encryptedDataAdapter.getData(['personal', 'age']);
  console.log(`   Age retrieved: ${ageAfterRotation}`);
  console.log(`   Data integrity: ${ageBeforeRotation === ageAfterRotation ? 'MAINTAINED' : 'CORRUPTED'}`);

  // 8. Performance demonstration
  console.log('\n⚡ Performance testing with caching:\n');

  const iterations = 100;
  
  // Test with cache
  console.log('Testing with cache enabled...');
  const startWithCache = Date.now();
  for (let i = 0; i < iterations; i++) {
    await encryptedDataAdapter.getData(['personal', 'age']);
  }
  const endWithCache = Date.now();
  
  // Clear cache and test without
  encryptedDataAdapter.clearCache();
  console.log('Testing without cache (cleared each time)...');
  const startWithoutCache = Date.now();
  for (let i = 0; i < iterations; i++) {
    await encryptedDataAdapter.getData(['personal', 'age']);
    encryptedDataAdapter.clearCache();
  }
  const endWithoutCache = Date.now();

  console.log(`⚡ With cache: ${endWithCache - startWithCache}ms for ${iterations} queries`);
  console.log(`🐌 Without cache: ${endWithoutCache - startWithoutCache}ms for ${iterations} queries`);
  console.log(`📈 Performance improvement: ${Math.round((endWithoutCache - startWithoutCache) / (endWithCache - startWithCache))}x faster with caching`);

  console.log('\n🎉 Encrypted Data Adapter example completed successfully!');
  console.log('\n🔐 Key Features Demonstrated:');
  console.log('   ✅ Transparent AES-256-GCM encryption');
  console.log('   ✅ Secure key derivation with PBKDF2');
  console.log('   ✅ Data integrity verification with checksums');
  console.log('   ✅ Access control and policy enforcement');
  console.log('   ✅ In-memory caching for performance');
  console.log('   ✅ Key rotation without data loss');
  console.log('   ✅ Seamless integration with VQP protocol');
}

// Run the example
main().catch((error) => {
  console.error('❌ Example failed:', error);
  process.exit(1);
});
