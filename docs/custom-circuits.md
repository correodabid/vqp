# Creating Custom ZK Circuits for VQP

This guide explains how to create custom zero-knowledge circuits for your VQP implementation.

## Overview

VQP includes support for zero-knowledge proofs through the `SnarkjsCryptoAdapter`, but **circuits are not included in the library**. Each use case requires custom circuits tailored to specific verification requirements.

## Why Custom Circuits?

- **Use Case Specific**: Each application has different verification needs
- **Security**: Circuits should be audited for your specific requirements  
- **Performance**: Optimized for your particular constraints
- **Trust**: You control the trusted setup process

## Prerequisites

```bash
npm install -g snarkjs
npm install circomlib
```

## Creating Your First Circuit

### 1. Design Your Circuit Logic

Create a `.circom` file for your verification logic:

```circom
// circuits/income_verification.circom
pragma circom 2.0.0;

template IncomeVerification() {
    signal input income;        // Private: actual income
    signal input threshold;     // Public: minimum required income
    signal output result;       // Public: verification result

    // Constraint: result = 1 if income >= threshold, 0 otherwise
    component gte = GreaterEqualThan(64);
    gte.in[0] <== income;
    gte.in[1] <== threshold;
    
    result <== gte.out;
}

component main = IncomeVerification();
```

### 2. Compile the Circuit

```bash
# Create build directory
mkdir -p circuits/build

# Compile circuit
circom circuits/income_verification.circom \
  --r1cs circuits/build/income_verification.r1cs \
  --wasm circuits/build/income_verification.wasm \
  --sym circuits/build/income_verification.sym
```

### 3. Trusted Setup

```bash
# Download ceremony file (do this once)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau

# Generate proving and verification keys
snarkjs groth16 setup \
  circuits/build/income_verification.r1cs \
  powersOfTau28_hez_final_12.ptau \
  circuits/build/income_verification_0000.zkey

# Optional: Contribute to ceremony (recommended for production)
snarkjs zkey contribute \
  circuits/build/income_verification_0000.zkey \
  circuits/build/income_verification_final.zkey \
  --name="Your contribution"

# Export verification key
snarkjs zkey export verificationkey \
  circuits/build/income_verification_final.zkey \
  circuits/build/income_verification_verification_key.json
```

### 4. Configure VQP

```typescript
import { VQPSystem, SnarkjsCryptoAdapter } from '@vqp/core';

const cryptoAdapter = new SnarkjsCryptoAdapter({
  circuitsPath: './circuits/build',
  circuits: {
    'income_verification': {
      wasmPath: './circuits/build/income_verification.wasm',
      zkeyPath: './circuits/build/income_verification_final.zkey',
      verificationKeyPath: './circuits/build/income_verification_verification_key.json'
    }
  }
});

const vqpSystem = new VQPSystem({
  crypto: { 
    type: 'snarkjs',
    adapter: cryptoAdapter 
  },
  // ... other config
});
```

### 5. Use in Queries

```typescript
// Generate ZK proof
const proof = await cryptoAdapter.generateZKProof('income_verification', {
  income: 75000      // Private input
}, {
  threshold: 50000   // Public input
});

// Verify proof
const isValid = await cryptoAdapter.verifyZKProof(
  proof, 
  { threshold: 50000 }, 
  'income_verification'
);
```

## Circuit Examples

### Age Verification
```circom
template AgeVerification() {
    signal input age;
    signal input minAge;
    signal output isValid;
    
    component gte = GreaterEqualThan(8);
    gte.in[0] <== age;
    gte.in[1] <== minAge;
    isValid <== gte.out;
}
```

### Range Proof
```circom
template RangeProof() {
    signal input value;
    signal input min;
    signal input max;
    signal output inRange;
    
    component gte = GreaterEqualThan(32);
    component lte = LessEqualThan(32);
    
    gte.in[0] <== value;
    gte.in[1] <== min;
    
    lte.in[0] <== value;
    lte.in[1] <== max;
    
    inRange <== gte.out * lte.out;
}
```

### Credit Score Verification
```circom
template CreditScoreVerification() {
    signal input score;
    signal input minScore;
    signal input hasHistory;
    signal output qualified;
    
    component scoreCheck = GreaterEqualThan(16);
    scoreCheck.in[0] <== score;
    scoreCheck.in[1] <== minScore;
    
    qualified <== scoreCheck.out * hasHistory;
}
```

## Best Practices

### Security
- **Audit your circuits** before production use
- **Use established libraries** like `circomlib`
- **Validate constraints** thoroughly
- **Test edge cases** extensively

### Performance
- **Minimize circuit size** for faster proving
- **Use efficient operations** 
- **Consider proving time vs verification time** tradeoffs
- **Benchmark different approaches**

### Development
- **Version your circuits** carefully
- **Document constraints** clearly
- **Test with real data** ranges
- **Automate circuit compilation**

## Circuit Development Workflow

```bash
# 1. Design circuit
vim circuits/my_verification.circom

# 2. Compile and test
npm run circuit:compile my_verification
npm run circuit:test my_verification

# 3. Setup trusted ceremony
npm run circuit:setup my_verification

# 4. Generate verification key
npm run circuit:export-vkey my_verification

# 5. Test integration
npm run test:zk my_verification
```

## Troubleshooting

### Common Issues

**Circuit compilation fails**
- Check circom syntax
- Verify imports from circomlib
- Ensure signal types match

**Proof generation fails**
- Validate input constraints
- Check signal ranges
- Verify witness generation

**Verification fails**
- Ensure public inputs match
- Check verification key format
- Validate proof structure

### Debugging Tips

```bash
# Generate witness for debugging
snarkjs wtns calculate \
  circuits/build/circuit.wasm \
  input.json \
  witness.wtns

# Check witness
snarkjs wtns export json witness.wtns witness.json
```

## Production Considerations

1. **Trusted Setup**: Conduct proper ceremony for production circuits
2. **Key Management**: Securely store and distribute verification keys
3. **Circuit Versioning**: Plan for circuit upgrades
4. **Performance**: Benchmark proving times at scale
5. **Security**: Regular security audits of circuit logic

## Further Reading

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [ZK-SNARKs Explained](https://z.cash/technology/zksnarks/)
- [Circomlib Library](https://github.com/iden3/circomlib)
