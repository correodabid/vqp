/**
 * Example: Age Verification using Zero-Knowledge Proofs with snarkjs
 * 
 * This example demonstrates how to use VQP with zk-SNARKs for privacy-preserving
 * age verification without revealing the actual age.
 * 
 * Prerequisites:
 * 1. Install circom and snarkjs
 * 2. Run: npm run zk:compile (to compile circuits)
 * 3. Run: npm run zk:setup (to generate proving keys)
 */

import { VQPSystem } from '../lib/vqp-system.js';
import { SnarkjsCryptoAdapter } from '../lib/adapters/crypto/snarkjs-adapter.js';
import { MemoryAuditAdapter } from '../lib/adapters/audit/memory-adapter.js';
import { VQPQuery } from '../lib/domain/types.js';

// Example circuit configuration for production use
const productionCircuitConfig = {
  circuits: {
    age_verification: {
      wasmPath: './circuits/age_verification_js/age_verification.wasm',
      zkeyPath: './circuits/age_verification_final.zkey',
      verificationKeyPath: './circuits/age_verification_verification_key.json',
      provingSystem: 'groth16' as const,
    },
    income_verification: {
      wasmPath: './circuits/income_verification_js/income_verification.wasm',
      zkeyPath: './circuits/income_verification_final.zkey',
      verificationKeyPath: './circuits/income_verification_verification_key.json',
      provingSystem: 'groth16' as const,
    },
  },
  circuitsDir: './circuits', // Base directory for circuit files
};

async function runZKProofExample() {
  console.log('🔐 VQP Zero-Knowledge Proof Example');
  console.log('=====================================\n');

  try {
    // 1. Create VQP system with ZK-enabled crypto adapter
    console.log('1. Setting up VQP system with snarkjs...');
    
    // Create the ZK crypto adapter directly
    const zkCrypto = new SnarkjsCryptoAdapter(productionCircuitConfig);
    const audit = new MemoryAuditAdapter();
    
    // Create VQP system with configuration format
    const vqpSystem = new VQPSystem({
      data: {
        type: 'filesystem',
        vaultPath: './examples/sample-vault.json',
      },
      crypto: {
        type: 'software',
        // We'll replace this with ZK crypto after construction
      },
      vocabulary: {
        type: 'http',
        allowedVocabularies: ['vqp:identity:v1', 'vqp:financial:v1'],
      },
      audit: {
        type: 'memory',
        maxEntries: 1000,
        includeFullQuery: true,
      },
    evaluation: {
      type: 'jsonlogic',
    }
    });

    // Replace the crypto adapter with our ZK-enabled one
    // Note: This is a workaround since VQPSystem doesn't support ZK crypto in config yet
    (vqpSystem as any).cryptoAdapter = zkCrypto;

    // Create vault data for the example
    const fs = await import('fs');
    const vaultData = {
      personal: {
        age: 28,
        citizenship: 'US',
        has_drivers_license: true,
      },
      financial: {
        annual_income: 75000,
        employment_status: 'employed',
      },
    };
    
    fs.writeFileSync('./examples/sample-vault.json', JSON.stringify(vaultData, null, 2));
    console.log('✅ Created sample vault data');

    // 2. Create a query that could use ZK proof
    console.log('2. Creating age verification query...');
    
    const zkQuery: VQPQuery = {
      id: 'zk-age-query-001',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:verifier.example.com',
      target: 'did:web:user.example.com',
      query: {
        lang: 'jsonlogic@1.0.0' as const,
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 18] },
      },
    };

    // 3. Process query (will use regular signature for now)
    console.log('3. Processing query...');
    
    try {
      const response = await vqpSystem.getService().processQuery(zkQuery);
      
      console.log('✅ Query processed successfully!');
      console.log('Response structure:', {
        queryId: response.queryId,
        result: response.result,
        proofType: response.proof.type,
        // Don't log signature data (it's long)
        hasProof: response.proof.type === 'signature' && !!(response.proof as any).signature,
      });

      // 4. Demonstrate ZK proof capabilities
      console.log('\n4. Testing ZK proof capabilities...');
      
      // Show that ZK methods are available
      const hasZKMethods = typeof zkCrypto.generateZKProof === 'function' &&
                          typeof zkCrypto.verifyZKProof === 'function';
      
      console.log('✅ ZK proof methods available:', hasZKMethods);
      
      // List circuits (will be empty until circuits are loaded)
      const circuits = await zkCrypto.listCircuits!();
      console.log('📊 Loaded circuits:', circuits.length);
      
    } catch (error) {
      console.log('⚠️  Query processing completed with standard signature');
      console.log('   This is expected without actual circuit files');
    }

    // 5. Show how to test ZK proof generation (mock)
    console.log('\n5. Testing ZK proof generation (mock)...');
    
    try {
      // This will fail since we don't have circuits loaded, but shows the API
      await zkCrypto.generateZKProof!('age_verification', { age: 28 }, { threshold: 18 });
      console.log('✅ ZK proof generated (unexpected success)');
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('Circuit not found') || err.message.includes('snarkjs')) {
        console.log('⚠️  Expected: Circuit not found (circuits need to be loaded first)');
      } else {
        console.log('❌ Unexpected error:', err.message);
      }
    }

    // 6. Show audit trail
    console.log('\n6. Audit trail:');
    const auditEntries = await audit.getAuditTrail();
    if (auditEntries.length > 0) {
      auditEntries.forEach((entry) => {
        console.log(`   [${entry.event}] ${entry.timestamp}`);
        if (entry.queryId) console.log(`     Query: ${entry.queryId}`);
        if (entry.error) console.log(`     Error: ${entry.error.message}`);
      });
    } else {
      console.log('   No audit entries (system not fully activated)');
    }

    // 7. Instructions for real ZK proof usage
    console.log('\n📝 To use real ZK proofs:');
    console.log('   1. Install circom: curl --proto "=https" --tlsv1.2 https://sh.rustup.rs -sSf | sh');
    console.log('   2. Compile circuits: npm run zk:compile');
    console.log('   3. Setup proving keys: npm run zk:setup');
    console.log('   4. Load circuits in adapter: await zkCrypto.loadCircuit(...)');
    console.log('   5. Generate ZK proofs: await zkCrypto.generateZKProof(...)');

  } catch (error) {
    const err = error as Error;
    console.error('❌ Example failed:', err.message);
  }

  // Cleanup
  try {
    const fs = await import('fs');
    fs.unlinkSync('./examples/sample-vault.json');
    console.log('\n🧹 Cleaned up example files');
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Example circuit in Circom (for reference)
const exampleCircuitCode = `
pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template AgeVerification() {
    signal private input age;
    signal input threshold;
    signal output valid;
    
    // Check if age >= threshold
    component gte = GreaterEqualThan(8);
    gte.in[0] <== age;
    gte.in[1] <== threshold;
    
    valid <== gte.out;
}

component main = AgeVerification();
`;

console.log('📋 Example Circom Circuit:');
console.log(exampleCircuitCode);
console.log('\n🚀 Running example...\n');

runZKProofExample().catch(console.error);

// Export for testing
export { productionCircuitConfig, exampleCircuitCode };
