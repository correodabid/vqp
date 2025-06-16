# @vqp/crypto-software

Software Cryptographic Adapter for VQP - implements CryptographicPort using software-based cryptography.

## Overview

This adapter provides cryptographic operations using pure software implementations. It supports Ed25519 digital signatures, key management, and integrates with VQP's proof system.

## Installation

```bash
npm install @vqp/crypto-software @vqp/core
```

## Usage

```typescript
import { VQPService } from '@vqp/core';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';

// Create the adapter
const cryptoAdapter = await createSoftwareCryptoAdapter({
  keyPath: './keys/private.key',
  algorithm: 'ed25519'
});

// Use with VQP service
const vqpService = new VQPService(
  dataAdapter,
  cryptoAdapter,
  evalAdapter,
  auditAdapter
);
```

## Configuration

### SoftwareCryptoConfig

```typescript
interface SoftwareCryptoConfig {
  keyPath: string;              // Path to private key file
  algorithm?: 'ed25519' | 'secp256k1' | 'rsa'; // Signature algorithm (default: ed25519)
  keyDerivation?: {
    iterations?: number;        // PBKDF2 iterations (default: 100000)
    salt?: string;             // Salt for key derivation
  };
  cacheEnabled?: boolean;       // Enable key caching (default: true)
  secureRandomSource?: string;  // Random source (default: 'crypto')
}
```

## Supported Algorithms

### Ed25519 (Recommended)
- **Key Size**: 32 bytes private, 32 bytes public
- **Signature Size**: 64 bytes
- **Security Level**: 128-bit equivalent
- **Performance**: Excellent
- **Use Cases**: General purpose, high-performance applications

### secp256k1 (Blockchain Compatible)
- **Key Size**: 32 bytes private, 33 bytes compressed public
- **Signature Size**: 64-71 bytes (DER encoding)
- **Security Level**: 128-bit equivalent
- **Performance**: Good
- **Use Cases**: Blockchain integration, cryptocurrency applications

### RSA-PSS (Enterprise Compatible)
- **Key Size**: 2048-4096 bits
- **Signature Size**: Key size dependent
- **Security Level**: 112-128 bit equivalent
- **Performance**: Moderate
- **Use Cases**: Enterprise systems, legacy compatibility

## Key Management

### Key Generation

```typescript
import { generateKeyPair, saveKeyPair } from '@vqp/crypto-software';

// Generate Ed25519 key pair
const { privateKey, publicKey } = await generateKeyPair('ed25519');

// Save to files
await saveKeyPair({
  privateKey,
  publicKey,
  privateKeyPath: './keys/private.key',
  publicKeyPath: './keys/public.key'
});
```

### Key Loading

```typescript
import { loadPrivateKey, loadPublicKey } from '@vqp/crypto-software';

// Load keys from files
const privateKey = await loadPrivateKey('./keys/private.key');
const publicKey = await loadPublicKey('./keys/public.key');
```

### Key Derivation

```typescript
const adapter = await createSoftwareCryptoAdapter({
  keyPath: './master.key',
  keyDerivation: {
    iterations: 100000,
    salt: 'vqp-crypto-salt'
  }
});
```

## API Reference

### createSoftwareCryptoAdapter

Factory function to create a software crypto adapter.

```typescript
async function createSoftwareCryptoAdapter(
  config: SoftwareCryptoConfig
): Promise<SoftwareCryptoAdapter>
```

### SoftwareCryptoAdapter

Implements the CryptographicPort interface.

```typescript
class SoftwareCryptoAdapter implements CryptographicPort {
  async sign(data: Buffer, keyId?: string): Promise<Signature>
  async verify(signature: Signature, data: Buffer, publicKey: string): Promise<boolean>
  async generateKeyPair(algorithm?: string): Promise<KeyPair>
  async deriveKey(password: string, salt: string): Promise<Buffer>
  async hash(data: Buffer, algorithm?: string): Promise<Buffer>
}
```

## Examples

### Basic Signing

```typescript
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';

const adapter = await createSoftwareCryptoAdapter({
  keyPath: './private.key'
});

// Sign data
const data = Buffer.from('Hello VQP');
const signature = await adapter.sign(data);

console.log('Signature:', signature.value);
console.log('Algorithm:', signature.algorithm);
```

### Signature Verification

```typescript
// Verify signature
const isValid = await adapter.verify(
  signature,
  data,
  publicKey
);

console.log('Signature valid:', isValid);
```

### Multiple Algorithms

```typescript
// Ed25519 for high performance
const ed25519Adapter = await createSoftwareCryptoAdapter({
  keyPath: './ed25519.key',
  algorithm: 'ed25519'
});

// secp256k1 for blockchain compatibility
const secp256k1Adapter = await createSoftwareCryptoAdapter({
  keyPath: './secp256k1.key',
  algorithm: 'secp256k1'
});

// RSA for enterprise systems
const rsaAdapter = await createSoftwareCryptoAdapter({
  keyPath: './rsa.key',
  algorithm: 'rsa'
});
```

## VQP Response Signing

The adapter automatically integrates with VQP's response signing:

```typescript
// VQP will use this adapter to sign responses
const response = await vqpService.processQuery(query);

// Response will include signature
console.log('Proof type:', response.proof.type); // 'signature'
console.log('Algorithm:', response.proof.algorithm); // 'ed25519'
console.log('Signature:', response.proof.signature); // hex-encoded signature
```

## Performance Benchmarks

| Algorithm | Key Gen | Sign | Verify | Use Case |
|-----------|---------|------|--------|----------|
| Ed25519   | ~1ms    | ~1ms | ~2ms   | General purpose |
| secp256k1 | ~5ms    | ~3ms | ~5ms   | Blockchain |
| RSA-2048  | ~100ms  | ~5ms | ~1ms   | Enterprise |

## Security Features

- **Secure Random**: Uses cryptographically secure random number generation
- **Key Protection**: Private keys are never exposed in memory longer than necessary
- **Constant Time**: Operations use constant-time algorithms where possible
- **Side Channel Resistance**: Resistant to timing attacks
- **Safe Defaults**: Secure default configurations

## Error Handling

```typescript
try {
  const signature = await adapter.sign(data);
} catch (error) {
  if (error.code === 'KEY_NOT_FOUND') {
    console.log('Private key file not found');
  } else if (error.code === 'INVALID_KEY_FORMAT') {
    console.log('Key file format is invalid');
  } else if (error.code === 'SIGNING_FAILED') {
    console.log('Cryptographic signing operation failed');
  }
}
```

## Best Practices

1. **Key Storage**: Store private keys in secure locations with proper file permissions
2. **Key Rotation**: Rotate keys regularly for long-running applications
3. **Algorithm Choice**: Use Ed25519 for new applications unless specific compatibility is needed
4. **Random Sources**: Ensure secure random number generation in production
5. **Key Backup**: Maintain secure backups of private keys

## Integration with Hardware

For production deployments requiring hardware security:

```typescript
// Use HSM adapter instead for production
import { createHSMCryptoAdapter } from '@vqp/crypto-hsm';

const adapter = await createHSMCryptoAdapter({
  hsmProvider: 'aws-cloudhsm',
  keyId: 'vqp-signing-key'
});
```

## License

MIT
