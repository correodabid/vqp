# VQP Zero-Knowledge Proof Integration Guide

This guide explains how to integrate zero-knowledge proofs with VQP using snarkjs.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Circuit Development](#circuit-development)
5. [Integration with VQP](#integration-with-vqp)
6. [Example Workflows](#example-workflows)
7. [Troubleshooting](#troubleshooting)

## Overview

VQP supports zero-knowledge proofs through the `SnarkjsCryptoAdapter`, which extends the standard cryptographic capabilities with zk-SNARK proof generation and verification using the snarkjs library.

### Benefits of ZK Proofs with VQP

- **Ultimate Privacy**: Prove data properties without revealing actual values
- **Verifiable Computation**: Cryptographically prove query results
- **Scalable Verification**: Fast verification regardless of computation complexity
- **Composable**: Combine with traditional signatures and other proof systems

## Prerequisites

### Required Tools

1. **Node.js** (v16 or later)
2. **Rust** (for circom compilation)
3. **circom** (circuit compiler)
4. **snarkjs** (proof generation)

### Installation Commands

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source ~/.cargo/env

# Install circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Install snarkjs (already included in VQP)
npm install snarkjs

# Verify installations
circom --version
snarkjs --help
```

## Circuit Development

### 1. Circuit Structure

VQP circuits follow a standard pattern:

```circom
pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template AgeVerification() {
    // Private inputs (secret data)
    signal private input age;
    
    // Public inputs (query parameters)
    signal input threshold;
    
    // Outputs (query results)
    signal output valid;
    
    // Circuit logic
    component gte = GreaterEqualThan(8);
    gte.in[0] <== age;
    gte.in[1] <== threshold;
    
    valid <== gte.out;
}

component main = AgeVerification();
```

### 2. Available Circuit Templates

#### Age Verification
```circom
// File: circuits/age_verification.circom
pragma circom 2.0.0;
include "circomlib/circuits/comparators.circom";

template AgeVerification() {
    signal private input age;
    signal input threshold;
    signal output valid;
    
    component gte = GreaterEqualThan(8);
    gte.in[0] <== age;
    gte.in[1] <== threshold;
    valid <== gte.out;
}

component main = AgeVerification();
```

#### Income Verification
```circom
// File: circuits/income_verification.circom
pragma circom 2.0.0;
include "circomlib/circuits/comparators.circom";

template IncomeVerification() {
    signal private input income;
    signal input threshold;
    signal output valid;
    
    component gte = GreaterEqualThan(32);
    gte.in[0] <== income;
    gte.in[1] <== threshold;
    valid <== gte.out;
}

component main = IncomeVerification();
```

### 3. Circuit Compilation

Use the provided scripts to compile circuits:

```bash
# Compile all circuits
npm run zk:compile

# Or manually compile a specific circuit
circom circuits/age_verification.circom --r1cs --wasm --sym -o circuits/
```

This generates:
- `age_verification.r1cs` - Constraint system
- `age_verification_js/age_verification.wasm` - WebAssembly witness calculator
- `age_verification.sym` - Symbol table

## Installation

Add ZK proof support to your VQP project:

```bash
# Install required dependencies
npm install snarkjs

# Optional: Install circomlib for reusable components
npm install circomlib
```

## Integration with VQP

### 1. Basic SnarkjsCryptoAdapter Setup

```typescript
import { SnarkjsCryptoAdapter } from '@vqp/protocol/adapters/crypto';

const zkCrypto = new SnarkjsCryptoAdapter({
  circuits: {
    age_verification: {
      wasmPath: './circuits/age_verification_js/age_verification.wasm',
      zkeyPath: './circuits/age_verification_final.zkey',
      verificationKeyPath: './circuits/age_verification_verification_key.json',
      provingSystem: 'groth16',
    },
    income_verification: {
      wasmPath: './circuits/income_verification_js/income_verification.wasm',
      zkeyPath: './circuits/income_verification_final.zkey',
      verificationKeyPath: './circuits/income_verification_verification_key.json',
      provingSystem: 'groth16',
    },
  },
  circuitsDir: './circuits',
});
```

### 2. VQP System Integration

```typescript
import { VQPSystem } from '@vqp/protocol';

// Create VQP system with ZK-enabled crypto adapter
const vqpSystem = new VQPSystem({
  data: {
    type: 'filesystem',
    vaultPath: './vault.json',
  },
  crypto: {
    type: 'software',
    // Note: Currently requires manual replacement
  },
  vocabulary: {
    type: 'http',
    allowedVocabularies: ['vqp:identity:v1', 'vqp:financial:v1'],
  },
  audit: {
    type: 'memory',
    maxEntries: 1000,
  },
  transport: {
    type: 'http',
    port: 3000,
  },
});

// Replace crypto adapter with ZK-enabled one
(vqpSystem as any).cryptoAdapter = zkCrypto;
```

### 3. Circuit Management

```typescript
// Load circuits dynamically
await zkCrypto.loadCircuit('age_verification:./circuits/age_verification_js/age_verification.wasm:./circuits/age_verification_final.zkey:./circuits/age_verification_verification_key.json');

// Check available circuits
const circuits = await zkCrypto.listCircuits();
console.log('Available circuits:', circuits);

// Check if specific circuit is loaded
const hasAgeCircuit = await zkCrypto.hasCircuit('age_verification');
```

## Example Workflows

### 1. Age Verification with ZK Proof

```typescript
// 1. Generate ZK proof for age verification
const zkProof = await zkCrypto.generateZKProof(
  'age_verification',
  { age: 28 },        // Private input
  { threshold: 18 }   // Public input
);

console.log('ZK Proof generated:', {
  type: zkProof.type,
  circuit: zkProof.circuit,
  publicInputs: zkProof.publicInputs,
  metadata: zkProof.metadata,
});

// 2. Verify the proof
const isValid = await zkCrypto.verifyZKProof(
  zkProof,
  { threshold: 18 },
  'age_verification'
);

console.log('Proof is valid:', isValid);
```

### 2. VQP Query with ZK Proof

```typescript
// Create a VQP query
const query = {
  id: 'zk-query-001',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  requester: 'did:web:verifier.example.com',
  query: {
    lang: 'jsonlogic@1.0.0',
    vocab: 'vqp:identity:v1',
    expr: { '>=': [{ var: 'age' }, 18] },
  },
};

// Process with ZK-enabled system
const response = await vqpSystem.getService().processQuery(query);

// The response will use ZK proof if the adapter supports it
console.log('Response:', {
  result: response.result,
  proofType: response.proof.type,
});
```

### 3. Income Range Proof

```typescript
// Prove income is in a range without revealing exact amount
const incomeProof = await zkCrypto.generateZKProof(
  'income_verification',
  { income: 75000 },    // Private: actual income
  { threshold: 50000 }  // Public: minimum threshold
);

// Verifier can confirm income >= 50000 without knowing actual amount
const valid = await zkCrypto.verifyZKProof(
  incomeProof,
  { threshold: 50000 },
  'income_verification'
);
```

## Troubleshooting

### Common Issues

#### 1. "Circuit not found" Error
```
Error: Circuit not found: age_verification
```

**Solution**: Load the circuit first:
```typescript
await zkCrypto.loadCircuit('age_verification:./circuits/age_verification_js/age_verification.wasm:./circuits/age_verification_final.zkey:./circuits/age_verification_verification_key.json');
```

#### 2. "snarkjs not available" Error
```
Error: snarkjs not available. Install with: npm install snarkjs
```

**Solution**: Install snarkjs:
```bash
npm install snarkjs
```

#### 3. File Path Issues
```
Error: Failed to load circuit age_verification: ENOENT: no such file or directory
```

**Solution**: Check file paths and ensure files exist:
```bash
ls -la circuits/
ls -la circuits/age_verification_js/
```

#### 4. Circuit Compilation Errors
```
Error: Compilation error in circuit
```

**Solution**: Check circom installation and circuit syntax:
```bash
circom --version
circom circuits/age_verification.circom --r1cs --wasm --sym -o circuits/
```

### Performance Considerations

#### Proof Generation Times
- Simple circuits (age verification): ~1-3 seconds
- Complex circuits (multiple constraints): ~5-30 seconds
- Very large circuits: May take minutes

#### Optimization Tips
1. **Minimize constraints**: Use efficient circom patterns
2. **Cache circuits**: Load circuits once at startup
3. **Batch operations**: Generate multiple proofs in parallel
4. **Use appropriate curve**: bn254 for most applications

### File Structure

Recommended project structure for ZK proofs:

```
project/
├── circuits/
│   ├── age_verification.circom
│   ├── income_verification.circom
│   ├── age_verification.r1cs
│   ├── age_verification_js/
│   │   ├── age_verification.wasm
│   │   └── witness_calculator.js
│   ├── age_verification_final.zkey
│   └── age_verification_verification_key.json
├── lib/
│   └── adapters/
│       └── crypto/
│           └── snarkjs-adapter.ts
└── examples/
    └── zk-proof-example.ts
```

## Next Steps

1. **Run Examples**: Try the provided ZK proof example
2. **Create Custom Circuits**: Develop circuits for your specific use cases
3. **Optimize Performance**: Profile and optimize circuit constraints
4. **Deploy**: Integrate ZK proofs into production VQP systems

For more information, see:
- [snarkjs documentation](https://github.com/iden3/snarkjs)
- [Circom documentation](https://docs.circom.io/)
- [VQP Protocol Specification](../docs/spec.md)
