# EncryptedDataAdapter

The `EncryptedDataAdapter` is an implementation of the `DataAccessPort` that provides transparent encryption of vault data using AES-256-GCM. This adapter is ideal for scenarios where sensitive data needs to be stored securely on disk.

## Key Features

### 🔐 Transparent Encryption
- **AES-256-GCM**: Military-grade authenticated encryption
- **PBKDF2**: Secure key derivation with multiple iterations
- **Unique IV**: Random initialization vector for each encryption
- **Integrity verification**: SHA-256 checksums to detect corruption

### 🔑 Key Management
- **Key rotation**: Change keys without data loss
- **Secure derivation**: PBKDF2 with customizable salt
- **Flexible configuration**: Adjustable iterations and key length

### 🛡️ Access Control
- **Granular policies**: Control by path and requester
- **Wildcards**: Flexible patterns for multiple paths
- **Rate limiting**: Query limitation per minute/hour
- **Default policy**: Configurable allow/deny

### ⚡ Performance
- **In-memory cache**: Reduces I/O operations
- **Configurable cache**: Enable/disable via configuration
- **Automatic invalidation**: Clears cache when saving data

## Configuration

```typescript
interface EncryptedDataConfig {
  vaultPath: string;                    // Path to encrypted vault file
  policiesPath?: string;                // Path to access policies file
  encryptionKey: string;                // Master encryption key
  keyDerivation?: {
    iterations: number;                 // PBKDF2 iterations (default: 100,000)
    salt?: string;                      // Salt for derivation (auto-generated if not provided)
    keyLength: number;                  // Key length in bytes (default: 32)
  };
  cacheEnabled?: boolean;               // Enable in-memory cache (default: true)
  compressionEnabled?: boolean;         // Enable compression before encryption (default: false)
}
```

## Basic Usage

### Initialization

```typescript
import { EncryptedDataAdapter } from '@vqp/protocol/adapters/data';

const adapter = new EncryptedDataAdapter({
  vaultPath: './secure-vault.json',
  policiesPath: './access-policies.json',
  encryptionKey: 'your-secure-master-key-change-in-production',
  keyDerivation: {
    iterations: 100000,  // More iterations = more secure but slower
    keyLength: 32        // 32 bytes = AES-256
  },
  cacheEnabled: true
});
```

### Saving Data

```typescript
const sensitiveData = {
  personal: {
    age: 28,
    citizenship: 'US',
    has_drivers_license: true
  },
  financial: {
    annual_income: 75000,
    credit_score: 720
  }
};

// Data is automatically encrypted when saved
await adapter.saveVault(sensitiveData);
```

### Data Access

```typescript
// Data is transparently decrypted
const age = await adapter.getData(['personal', 'age']);
console.log(age); // 28

// Existence verification
const hasData = await adapter.hasData(['personal', 'age']);
console.log(hasData); // true

// Access validation
const canAccess = await adapter.validateDataAccess(
  ['financial', 'credit_score'], 
  'did:example:authorized-service'
);
console.log(canAccess); // true/false according to policies
```

## Encrypted Vault Structure

```json
{
  "version": "1.0.0",
  "algorithm": "aes-256-gcm",
  "keyDerivation": {
    "iterations": 100000,
    "salt": "generated-salt-hex",
    "keyLength": 32
  },
  "encryptedData": "base64-encoded-encrypted-data",
  "iv": "base64-encoded-initialization-vector",
  "authTag": "base64-encoded-authentication-tag",
  "timestamp": "2025-06-13T08:44:50.123Z",
  "checksum": "sha256-hex-checksum-of-original-data"
}
```

## Access Policies

```json
{
  "allowed_paths": {
    "personal.age": ["did:example:age-verifier", "did:example:kyc-service"],
    "financial.annual_income": ["did:example:loan-service"]
  },
  "wildcard_paths": {
    "system.*": ["*"],
    "public.*": ["*"]
  },
  "default_policy": "deny",
  "rate_limits": {
    "did:example:limited-service": {
      "requests_per_minute": 10,
      "requests_per_hour": 100
    }
  }
}
```

## Advanced Operations

### Key Rotation

```typescript
// Change to a new encryption key
await adapter.rotateEncryptionKey('new-secure-master-key');

// Data is automatically re-encrypted with the new key
// Previous key becomes invalid
```

### Cache Management

```typescript
// Clear cache manually
adapter.clearCache();

// Data will be reloaded from disk on next access
```

### Migration from Plain Vault

```typescript
// The adapter automatically detects unencrypted vaults
// and encrypts them on first access

// Original vault (plain JSON):
// { "personal": { "age": 28 } }

// After first access, automatically converts to:
// { "version": "1.0.0", "algorithm": "aes-256-gcm", ... }
```

## Use Cases

### 1. Personal Vault
```typescript
const personalVault = new EncryptedDataAdapter({
  vaultPath: '~/.vqp/personal-vault.json',
  encryptionKey: await deriveFromPassword(userPassword),
  keyDerivation: {
    iterations: 200000,  // Higher security for personal data
    keyLength: 32
  }
});
```

### 2. Enterprise Service
```typescript
const enterpriseVault = new EncryptedDataAdapter({
  vaultPath: '/secure/enterprise-data.json',
  policiesPath: '/config/enterprise-policies.json',
  encryptionKey: process.env.ENCRYPTION_KEY,
  keyDerivation: {
    iterations: 100000,
    keyLength: 32
  },
  cacheEnabled: true  // Important for high performance
});
```

### 3. IoT/Edge Device
```typescript
const iotVault = new EncryptedDataAdapter({
  vaultPath: '/data/sensor-vault.json',
  encryptionKey: deviceSecretKey,
  keyDerivation: {
    iterations: 50000,   // Fewer iterations for resource-constrained devices
    keyLength: 32
  },
  cacheEnabled: false  // Save memory on limited devices
});
```

## Security Considerations

### ✅ Best Practices

1. **Strong keys**: Use keys with at least 32 characters and high entropy
2. **PBKDF2 iterations**: Minimum 100,000 iterations for sensitive data
3. **Regular rotation**: Change keys periodically
4. **Restrictive policies**: Use default_policy="deny" in production
5. **Rate limiting**: Configure limits to prevent abuse

### ⚠️ Warnings

1. **Key loss**: Without the encryption key, data is irrecoverable
2. **Key storage**: Never hardcode keys in source code
3. **Backups**: Maintain secure backups of keys and data
4. **Logs**: Do not log keys or sensitive data

## Performance

### Typical Benchmarks
- **Encryption**: ~1-5ms for 1-10KB vaults
- **Decryption**: ~1-3ms for 1-10KB vaults  
- **With cache**: ~0.1ms for repeated accesses
- **Key derivation**: ~50-200ms depending on iterations

### Optimizations
- Use cache for frequent accesses
- Adjust PBKDF2 iterations based on security vs. performance needs
- Consider compression for large vaults
- Use SSD for better I/O performance

## VQP Integration

```typescript
import { VQPService } from '@vqp/protocol';
import { EncryptedDataAdapter } from '@vqp/protocol/adapters/data';
import { SoftwareCryptoAdapter } from '@vqp/protocol/adapters/crypto';

// Create encrypted adapter
const dataAdapter = new EncryptedDataAdapter({
  vaultPath: './vault.json',
  encryptionKey: process.env.VAULT_KEY
});

// Integrate with VQP Service
const vqpService = new VQPService(
  dataAdapter,                    // Data encrypted transparently
  new SoftwareCryptoAdapter(),   // Cryptography for proofs
  vocabularyAdapter,             // Vocabulary resolution
  auditAdapter                   // Audit logging
);

// VQP queries work normally with encrypted data
const response = await vqpService.processQuery({
  id: 'query-uuid',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  requester: 'did:example:service',
  query: {
    lang: 'jsonlogic@1.0.0',
    vocab: 'vqp:identity:v1',
    expr: { '>=': [{ 'var': 'personal.age' }, 18] }
  }
});
```

## Adapter Comparison

| Feature | EncryptedDataAdapter | FileSystemDataAdapter | MemoryDataAdapter |
|---------|---------------------|----------------------|-------------------|
| Persistence | ✅ Encrypted | ✅ Plain | ❌ Volatile |
| Security | 🔐 High | ⚠️ Basic | ⚠️ None |
| Performance | ⚡ Good | ⚡ Excellent | 🚀 Maximum |
| Key rotation | ✅ Yes | ❌ No | ❌ No |
| Access control | ✅ Complete | ✅ Complete | ⚠️ Basic |
| Use cases | Production | Development | Testing |

## Migration

### From FileSystemDataAdapter

```typescript
// 1. Backup current vault
await fs.copyFile('vault.json', 'vault-backup.json');

// 2. Read data with previous adapter
const oldAdapter = new FileSystemDataAdapter({ vaultPath: 'vault.json' });
const data = await oldAdapter.getData([]);  // Get all data

// 3. Migrate to encrypted adapter
const newAdapter = new EncryptedDataAdapter({
  vaultPath: 'vault-encrypted.json',
  encryptionKey: 'your-new-encryption-key'
});
await newAdapter.saveVault(data);

// 4. Verify migration
const migratedAge = await newAdapter.getData(['personal', 'age']);
console.log('Migration successful:', migratedAge);
```

The `EncryptedDataAdapter` provides a robust and secure solution for storing sensitive data in VQP applications, maintaining transparency and ease of use while adding a critical security layer.
