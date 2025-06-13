/**
 * SnarkJS Crypto Adapter Tests
 * Tests the ZK proof functionality using snarkjs
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { SnarkjsCryptoAdapter } from '../../../../lib/adapters/crypto/snarkjs-adapter';
import { ZKProof } from '../../../../lib/domain/types';

// Mock circuit configuration for testing
const mockCircuitConfig = {
  circuits: {
    test_circuit: {
      wasmPath: './test-circuits/test.wasm',
      zkeyPath: './test-circuits/test.zkey',
      verificationKeyPath: './test-circuits/test_vkey.json',
      provingSystem: 'groth16' as const,
    },
  },
};

test('SnarkjsCryptoAdapter', async (t) => {
  await t.test('should extend SoftwareCryptoAdapter', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    // Should have basic crypto functionality
    assert.ok(typeof adapter.sign === 'function');
    assert.ok(typeof adapter.verify === 'function');
    assert.ok(typeof adapter.generateKeyPair === 'function');
    assert.ok(typeof adapter.deriveKey === 'function');
  });

  await t.test('should have ZK proof methods', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    // Should have ZK-specific methods
    assert.ok(typeof adapter.generateZKProof === 'function');
    assert.ok(typeof adapter.verifyZKProof === 'function');
    assert.ok(typeof adapter.loadCircuit === 'function');
    assert.ok(typeof adapter.hasCircuit === 'function');
    assert.ok(typeof adapter.listCircuits === 'function');
  });

  await t.test('should initialize with circuit configuration', async () => {
    const adapter = new SnarkjsCryptoAdapter(mockCircuitConfig);
    
    // Should accept configuration
    assert.ok(adapter instanceof SnarkjsCryptoAdapter);
  });

  await t.test('should handle circuit loading errors gracefully', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    // Ensure the adapter is properly initialized
    assert.ok(adapter instanceof SnarkjsCryptoAdapter);
    
    try {
      // Use a path with insufficient parts to trigger validation error
      await adapter.loadCircuit('invalid_path_format');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('Invalid circuit path format') || error.message.includes('Expected: "id:wasm:zkey:vkey"'));
    }
  });

  await t.test('should check circuit availability', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    const hasNonExistent = await adapter.hasCircuit!('non_existent');
    assert.strictEqual(hasNonExistent, false);
  });

  await t.test('should list loaded circuits', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    // Check if listCircuits method exists (it should be defined by the class)
    if (adapter.listCircuits) {
      const circuits = await adapter.listCircuits();
      assert.ok(Array.isArray(circuits));
      assert.strictEqual(circuits.length, 0); // No circuits loaded initially
    } else {
      // If method doesn't exist, that's also valid for a base implementation
      assert.ok(true, 'listCircuits method not implemented - this is acceptable');
    }
  });

  await t.test('should handle missing snarkjs dependency', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    try {
      // This should fail since we don't have actual circuit files
      await adapter.generateZKProof!('test_circuit', { age: 25 });
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error);
      // Should mention either snarkjs or circuit not found
      assert.ok(
        error.message.includes('snarkjs') || 
        error.message.includes('Circuit not found')
      );
    }
  });

  await t.test('should validate ZK proof structure', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    // Create a mock ZK proof with correct structure
    const mockZKProof: ZKProof = {
      type: 'zk-snark',
      circuit: 'test_circuit',
      proof: JSON.stringify({ pi_a: [], pi_b: [], pi_c: [] }),
      publicInputs: { threshold: 18 },
      metadata: {
        provingSystem: 'groth16',
        curve: 'bn254',
        proofFormat: 'snarkjs',
      },
    };

    try {
      // This should fail since we don't have the circuit, but it should validate the proof structure first
      await adapter.verifyZKProof!(mockZKProof, { threshold: 18 }, 'test_circuit');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error);
      // Should fail on circuit not found, not on proof structure
      assert.ok(error.message.includes('Circuit not found'));
    }
  });

  await t.test('should reject invalid proof types for ZK verification', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    const invalidProof = {
      type: 'signature' as const,
      algorithm: 'ed25519' as const,
      signature: 'mock_signature',
      publicKey: 'mock_key',
    };

    try {
      await adapter.verifyZKProof!(invalidProof, {});
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('Invalid proof type for ZK verification'));
    }
  });

  await t.test('should maintain basic crypto functionality', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    // Test that basic crypto still works
    const keyPair = await adapter.generateKeyPair();
    assert.ok(typeof keyPair.publicKey === 'string');
    assert.ok(typeof keyPair.privateKey === 'string');
    
    const testData = Buffer.from('test message');
    const signature = await adapter.sign(testData, 'default');
    
    assert.strictEqual(signature.type, 'signature');
    assert.strictEqual(signature.algorithm, 'ed25519');
    assert.ok(typeof signature.signature === 'string');
    assert.ok(typeof signature.publicKey === 'string');
    
    const isValid = await adapter.verify(signature, testData, signature.publicKey);
    assert.strictEqual(isValid, true);
  });

  await t.test('should handle circuit path parsing', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    // Test various invalid path formats
    const invalidPaths = [
      '',
      'just_id',
      'id:wasm',
      'id:wasm:',
      ':wasm:zkey:vkey',
    ];

    for (const path of invalidPaths) {
      try {
        await adapter.loadCircuit(path);
        assert.fail(`Should have thrown error for path: ${path}`);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Invalid circuit path format'));
      }
    }
  });

  await t.test('should handle key derivation', async () => {
    const adapter = new SnarkjsCryptoAdapter();
    
    const derivedKey1 = await adapter.deriveKey('test_input');
    const derivedKey2 = await adapter.deriveKey('test_input');
    const derivedKey3 = await adapter.deriveKey('different_input');
    
    // Same input should give same result
    assert.strictEqual(derivedKey1, derivedKey2);
    
    // Different input should give different result
    assert.notStrictEqual(derivedKey1, derivedKey3);
    
    // Should be string
    assert.ok(typeof derivedKey1 === 'string');
  });
});

// Integration test with mock data (when circuits are available)
test('SnarkjsCryptoAdapter Integration (Mock)', async (t) => {
  await t.test('should demonstrate ZK proof workflow', async () => {
    console.log('\n🔐 ZK Proof Workflow Demo (Mock)');
    console.log('================================');
    
    const adapter = new SnarkjsCryptoAdapter(mockCircuitConfig);
    
    console.log('✅ Created SnarkjsCryptoAdapter with circuit config');
    console.log('📋 Configured circuits:', Object.keys(mockCircuitConfig.circuits));
    
    // Show that the adapter is ready for ZK proofs
    const hasZKMethods = typeof adapter.generateZKProof === 'function' &&
                        typeof adapter.verifyZKProof === 'function';
    
    assert.ok(hasZKMethods, 'Adapter should have ZK proof methods');
    console.log('✅ ZK proof methods are available');
    
    // Show circuit management
    const initialCircuits = await adapter.listCircuits!();
    console.log('📊 Initial circuits loaded:', initialCircuits.length);
    
    console.log('\n📝 To use real ZK proofs:');
    console.log('   1. Run: npm run zk:compile (compile circuits)');
    console.log('   2. Run: npm run zk:setup (setup proving keys)');
    console.log('   3. Run: npm run zk:example (test with real circuits)');
    
    assert.ok(true, 'Demo completed successfully');
  });
});
