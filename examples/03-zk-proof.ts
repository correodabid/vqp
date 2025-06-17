/**
 * VQP Example 3: Zero-Knowledge Proof
 *
 * Demonstrates privacy-preserving verification using ZK-SNARKs:
 * - Generate ZK proof for age verification
 * - Verify proof without revealing actual age
 * - Shows integration between crypto adapters
 */

import { VQPService, QueryBuilder, createResponseModeAdapter, VocabularyPort } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSnarkjsCryptoAdapter } from '@vqp/crypto-snarkjs';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

// Simple vocabulary adapter for the example
class MockVocabularyAdapter implements VocabularyPort {
  async resolveVocabulary(uri: string): Promise<any> {
    if (uri === 'vqp:identity:v1') {
      return IDENTITY_VOCAB;
    }
    throw new Error(`Unknown vocabulary: ${uri}`);
  }

  async validateAgainstVocabulary(data: any, vocabulary: any): Promise<boolean> {
    return true; // Simplified validation
  }

  async cacheVocabulary(uri: string, schema: any): Promise<void> {
    // No-op for this example
  }

  async isVocabularyAllowed(uri: string): Promise<boolean> {
    return uri === 'vqp:identity:v1';
  }
}

const IDENTITY_VOCAB = {
  type: 'object',
  properties: {
    age: { type: 'integer', minimum: 0, maximum: 150 },
  },
};

async function main() {
  console.log('🔐 VQP Example: Zero-Knowledge Proof');

  // Initialize VQP with ZK-SNARK crypto adapter
  const zkCrypto = createSnarkjsCryptoAdapter({
    circuits: {
      age_verification: {
        wasmPath: './circuits/age_verification_js/age_verification.wasm',
        zkeyPath: './circuits/age_verification_final.zkey',
        verificationKeyPath: './circuits/age_verification_verification_key.json',
        provingSystem: 'groth16',
      },
    },
  });

  const vqpService = new VQPService(
    await createFileSystemDataAdapter({
      vaultPath: './examples/sample-vault.json',
    }),
    zkCrypto,
    await createConsoleAuditAdapter(),
    await createJSONLogicAdapter(),
    createResponseModeAdapter({
      autoConsent: true,
      defaultMode: 'strict',
    }),
    new MockVocabularyAdapter()
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
      proofSize:
        response.proof.type === 'zk-snark' ? (response.proof as any).proof?.length || 0 : 0,
      publicInputs:
        response.proof.type === 'zk-snark' ? (response.proof as any).publicInputs : undefined,
    });

    // Verify ZK proof
    if (response.proof.type === 'zk-snark') {
      console.log('🔍 Verifying ZK proof...');
      const isValid = await zkCrypto.verifyZKProof(
        response.proof,
        (response.proof as any).publicInputs,
        'age_verification'
      );

      console.log('✅ ZK Proof Valid:', isValid);
      console.log('🎉 Privacy-preserving verification complete!');
      console.log('📊 What was proven:', {
        'Age >= 18': response.result,
        'Actual age revealed': false,
        'Cryptographic certainty': isValid,
      });
    } else {
      console.log('ℹ️  Note: ZK proof not generated - using standard signature');
      console.log('📊 Result:', {
        'Age >= 18': response.result,
        'Proof type': response.proof.type,
      });
    }
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
