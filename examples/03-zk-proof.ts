/**
 * VQP Example 3: Zero-Knowledge Proof
 *
 * Demonstrates privacy-preserving verification using ZK-SNARKs:
 * - Generate ZK proof for age verification
 * - Verify proof without revealing actual age
 * - Shows integration between crypto adapters
 */

import { VQPService, QueryBuilder } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSnarkjsCryptoAdapter } from '@vqp/crypto-snarkjs';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

const IDENTITY_VOCAB = {
  type: 'object',
  properties: {
    age: { type: 'integer', minimum: 0, maximum: 150 },
  },
};

async function main() {
  console.log('🔐 VQP Example: Zero-Knowledge Proof');

  // Initialize VQP with ZK-SNARK crypto adapter
  const zkCrypto = await createSnarkjsCryptoAdapter({
    circuitWasmPath: './circuits/age_verification_js/age_verification.wasm',
    circuitZkeyPath: './circuits/age_verification_final.zkey',
    verificationKeyPath: './circuits/age_verification_verification_key.json',
  });

  const vqpService = new VQPService(
    await createFileSystemDataAdapter({
      vaultPath: './examples/sample-vault.json',
    }),
    zkCrypto,
    await createConsoleAuditAdapter(),
    await createJSONLogicAdapter()
  );

  // Build age verification query (ZK-friendly)
  const query = new QueryBuilder()
    .requester('did:web:privacy-focused-service.com')
    .vocabulary('vqp:identity:v1')
    .expression({
      '>=': [{ var: 'age' }, 18],
    })
    .build();

  console.log('📤 ZK Query:', {
    expression: query.query.expr,
    requester: query.requester,
  });

  try {
    // Process query - will generate ZK proof internally
    console.log('⚡ Generating ZK proof... (this may take a few seconds)');
    const startTime = Date.now();

    const response = await vqpService.processQuery(query, {
      'vqp:identity:v1': IDENTITY_VOCAB,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ ZK proof generated in ${duration}ms`);

    console.log('📥 ZK Response:', {
      result: response.result,
      proofType: response.proof.type,
      proofSize: response.proof.proof ? response.proof.proof.length : 0,
      publicInputs: response.proof.publicInputs,
    });

    // Verify ZK proof
    console.log('🔍 Verifying ZK proof...');
    const isValid = await zkCrypto.verifyZKProof(
      {
        proof: response.proof.proof,
        publicInputs: response.proof.publicInputs,
      },
      response.proof.publicInputs
    );

    console.log('✅ ZK Proof Valid:', isValid);
    console.log('🎉 Privacy-preserving verification complete!');
    console.log('📊 What was proven:', {
      'Age >= 18': response.result,
      'Actual age revealed': false,
      'Cryptographic certainty': isValid,
    });
  } catch (error) {
    console.error('❌ ZK proof generation failed:', error.message);

    if (error.message.includes('WASM') || error.message.includes('circuit')) {
      console.log('💡 Make sure circuit files are compiled:');
      console.log('   Run: cd tools && ./compile-circuits.sh');
    }
  }
}

// Run the example
main().catch(console.error);
