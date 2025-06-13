#!/usr/bin/env node

/**
 * Complete VQP with ZK Proof Example
 * 
 * This example demonstrates how to use VQP with zero-knowledge proofs
 * to prove age verification without revealing the actual age.
 */

import { VQPSystem } from '../lib/vqp-system.js';
import { SnarkjsCryptoAdapter } from '../lib/adapters/crypto/snarkjs-adapter.js';
import { QueryBuilder } from '../lib/domain/query-builder.js';
import { ZKProof } from '../lib/domain/types.js';
import chalk from 'chalk';

async function demonstrateZKProofIntegration() {
  console.log(chalk.blue('🔒 VQP Zero-Knowledge Proof Integration Demo'));
  console.log('===========================================\n');

  try {
    // 1. Setup VQP System with ZK-capable crypto adapter
    console.log(chalk.yellow('1. Setting up VQP system with ZK capabilities...'));
    
    const zkConfig = {
      circuits: {
        age_verification: {
          wasmPath: './circuits/age_verification_js/age_verification.wasm',
          zkeyPath: './circuits/age_verification_final.zkey',
          verificationKeyPath: './circuits/age_verification_verification_key.json',
          provingSystem: 'groth16' as const
        }
      }
    };

    const vqpSystem = new VQPSystem({
      data: {
        type: 'filesystem',
        vaultPath: './examples/sample-vault.json'
      },
      crypto: {
        type: 'snarkjs',
        config: zkConfig
      },
      transport: {
        type: 'memory'
      },
      vocabulary: {
        type: 'http'
      },
      audit: {
        type: 'memory'
      }
    });

    await vqpSystem.initialize();
    console.log(chalk.green('✅ VQP system initialized with ZK support\n'));

    // 2. Create ZK crypto adapter manually for demonstration
    console.log(chalk.yellow('2. Configuring ZK crypto adapter...'));
    const zkCrypto = new SnarkjsCryptoAdapter(zkConfig);
    
    // Load the age verification circuit
    const circuitPath = 'age_verification:./circuits/age_verification_js/age_verification.wasm:./circuits/age_verification_final.zkey:./circuits/age_verification_verification_key.json';
    await zkCrypto.loadCircuit!(circuitPath);
    console.log(chalk.green('✅ ZK circuit loaded\n'));

    // 3. Create a ZK-proof query
    console.log(chalk.yellow('3. Creating ZK-proof query...'));
    
    const zkQuery = new QueryBuilder()
      .requester('did:example:age-verifier')
      .target('did:example:zk-demo-responder')
      .vocabulary('vqp:identity:v1')
      .expression({
        ">=": [{ "var": "age" }, 18]
      })
      .build();

    console.log('Query:', JSON.stringify(zkQuery, null, 2));

    // 4. Process query with ZK proof generation
    console.log(chalk.yellow('\n4. Processing query with ZK proof...'));
    
    // In a real scenario, this would happen automatically within VQP
    // Here we're demonstrating the ZK proof generation manually
    
    // Generate ZK proof that age >= 18 without revealing actual age
    const ageFromVault = 25; // This would come from the encrypted vault
    const threshold = 18;
    
    const zkProofInputs = {
      age: ageFromVault,
      threshold: threshold
    };
    
    console.log(chalk.blue('Generating ZK proof...'));
    const zkProof = await zkCrypto.generateZKProof!('age_verification', zkProofInputs) as ZKProof;
    
    console.log(chalk.green('✅ ZK proof generated!'));
    console.log('ZK Proof type:', zkProof.type);
    console.log('Circuit:', zkProof.circuit);
    console.log('Public signals:', zkProof.publicInputs);
    console.log('Metadata:', zkProof.metadata);

    // 5. Create VQP response with ZK proof
    console.log(chalk.yellow('\n5. Creating VQP response with ZK proof...'));
    
    const vqpResponse = {
      queryId: zkQuery.id,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      responder: 'did:example:zk-demo-responder',
      result: true, // Age >= 18 is true
      proof: zkProof
    };

    console.log('VQP Response:');
    console.log(JSON.stringify(vqpResponse, null, 2));

    // 6. Verify the ZK proof
    console.log(chalk.yellow('\n6. Verifying ZK proof...'));
    
    const isProofValid = await zkCrypto.verifyZKProof!(zkProof, { threshold }, 'age_verification');
    
    if (isProofValid) {
      console.log(chalk.green('✅ ZK proof is VALID!'));
      console.log(chalk.green('✅ Age verification confirmed without revealing actual age'));
    } else {
      console.log(chalk.red('❌ ZK proof is INVALID!'));
    }

    // 7. Demonstrate privacy preservation
    console.log(chalk.yellow('\n7. Privacy Analysis:'));
    console.log(chalk.blue('🔒 What was revealed:'));
    console.log('   - Person is 18 or older: ✅');
    console.log('   - Proof is cryptographically valid: ✅');
    
    console.log(chalk.blue('\n🔒 What was NOT revealed:'));
    console.log('   - Actual age: ❌ (Hidden)');
    console.log('   - Birth date: ❌ (Hidden)');
    console.log('   - Any other personal information: ❌ (Hidden)');

    // 8. Show comparison with traditional approach
    console.log(chalk.yellow('\n8. Comparison with Traditional Approach:'));
    
    console.log(chalk.red('Traditional ID verification:'));
    console.log('   ❌ Requires sharing government ID');
    console.log('   ❌ Reveals full birth date');
    console.log('   ❌ Often reveals address, ID number');
    console.log('   ❌ Creates privacy risk');
    console.log('   ❌ Requires trust in verifier');
    
    console.log(chalk.green('\nVQP with ZK proofs:'));
    console.log('   ✅ No personal documents shared');
    console.log('   ✅ Only reveals necessary information');
    console.log('   ✅ Cryptographically verifiable');
    console.log('   ✅ Zero-knowledge privacy');
    console.log('   ✅ User maintains control');

    console.log(chalk.blue('\n🎉 Demo completed successfully!'));
    console.log(chalk.blue('VQP with ZK proofs enables privacy-preserving verification!'));

    process.exit(0);

  } catch (error) {
    console.error(chalk.red('Demo failed:'), error);
    process.exit(1);
  }
}

// Run the demo
demonstrateZKProofIntegration().catch(console.error);
