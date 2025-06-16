# VQP Examples - Modular Architecture

This directory contains clean, focused examples demonstrating VQP's modular architecture and best practices.

## 🚀 Quick Start

```bash
# Install core packages (when published)
npm install @vqp/core @vqp/data-filesystem @vqp/crypto-software

# Run examples (development mode)
npm run build && npx tsx examples/01-basic-age-verification.ts
```

## 📚 Examples Overview

### 1. Basic Age Verification (`01-basic-age-verification.ts`)
**What it shows:** Essential VQP workflow - query, evaluate, respond, verify
**Packages used:** `@vqp/core`, `@vqp/data-filesystem`, `@vqp/crypto-software`
**Use case:** Verify someone is over 18 without revealing their actual age

### 2. Complete System Integration (`02-complete-system.ts`)
**What it shows:** Production-ready VQP service with multiple vocabularies
**Packages used:** Core + file audit adapter
**Use case:** Multi-domain verification system (identity + financial)

### 3. Zero-Knowledge Proofs (`03-zk-proof.ts`)
**What it shows:** Privacy-preserving verification with cryptographic proofs
**Packages used:** `@vqp/crypto-snarkjs` for ZK-SNARK generation
**Use case:** Prove age ≥ 18 without revealing actual age

### 4. IoT/Edge Device (`04-iot-edge.ts`)
**What it shows:** Lightweight VQP for resource-constrained environments
**Packages used:** In-memory adapters, minimal footprint
**Use case:** Smart home sensor queries

### 5. Custom Adapters (`05-custom-adapters.ts`)
**What it shows:** How to create custom adapters following VQP patterns
**Packages used:** Core + custom implementations
**Use case:** API-based data sources, webhook audit logging

### 6. Custom Vocabulary Mapping (`06-custom-vocabulary-mapping.ts`)
**What it shows:** Demonstrates how to create custom vocabulary mappings for non-standard vault structures and custom vocabularies.
**Use case:** 
- Employee management systems with nested data structures
- IoT device networks with device-specific data organization
- Custom enterprise systems with existing data layouts
- Multi-tenant systems with tenant-specific data organization

## 🏗️ Architecture Benefits

Each example demonstrates VQP's **hexagonal architecture**:

```typescript
// Clean separation of concerns
const vqpService = new VQPService(
  dataAdapter,    // How we access data
  cryptoAdapter,  // How we handle cryptography  
  evaluator,      // How we evaluate queries
  auditAdapter    // How we log activities
);
```

**Benefits:**
- ✅ **Technology Independence**: Swap adapters without changing core logic
- ✅ **Easy Testing**: Mock adapters for unit tests
- ✅ **Bundle Optimization**: Include only needed adapters
- ✅ **Clear Dependencies**: Explicit adapter interfaces

## 📦 Package Usage Patterns

### Minimal Setup (Custom Adapters)
```typescript
import { VQPService } from '@vqp/core';
import { createJSONLogicEvaluator } from '@vqp/evaluation-jsonlogic';
// + your custom adapters
```

### Standard Setup (File-based)
```typescript
import { VQPService } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicEvaluator } from '@vqp/evaluation-jsonlogic';
```

### Privacy-Enhanced Setup (ZK Proofs)
```typescript
import { VQPService } from '@vqp/core';
import { createSNARKjsCryptoAdapter } from '@vqp/crypto-snarkjs';
// + other adapters
```

## 🔧 Configuration Files

- **`sample-vault.json`** - Sample data for testing
- **`access-policies.json`** - Access control examples

## 🏃‍♂️ Running Examples

### Development Mode (Current)
```bash
# Build packages
npm run build

# Run example
npx tsx examples/01-basic-age-verification.ts
```

### Production Mode (After Publishing)
```bash
# Install specific packages
npm install @vqp/core @vqp/data-filesystem @vqp/crypto-software

# Run with real packages
node examples/01-basic-age-verification.js
```

### ZK Proof Examples
```bash
# Compile circuits first
cd tools && ./compile-circuits.sh

# Run ZK example
npx tsx examples/03-zk-proof.ts
```

## 🎯 Use Case Categories

### Identity & Access
- Age verification
- Credential validation
- Access control

### Financial Services
- Income verification
- Credit checks
- Loan qualification

### IoT & Monitoring
- Device health checks
- Environmental monitoring
- Security status

### Privacy & Compliance
- Zero-knowledge verification
- Audit logging
- Data minimization

## 🔒 Security Patterns

Examples demonstrate:
- **Input validation** against vocabularies
- **Access control** with requester validation
- **Secure key management** with crypto adapters
- **Audit logging** for compliance
- **Error handling** without information leakage

## 📊 Performance Characteristics

| Example | Bundle Size | Response Time | Use Case |
|---------|-------------|---------------|----------|
| Basic | ~150KB | <100ms | Simple verification |
| Complete | ~200KB | <100ms | Multi-domain system |
| ZK Proof | ~300KB | 2-5s | Privacy-preserving |
| IoT | ~100KB | <50ms | Resource-constrained |
| Custom | ~120KB | <100ms | Extensibility |

## 🚀 Next Steps

1. **Start with Example 1** to understand core concepts
2. **Explore your use case** in the relevant example
3. **Create custom adapters** using Example 5 as template
4. **Check documentation** in `/docs` for production deployment

## 💡 Development Tips

- **Use TypeScript** for better development experience
- **Mock adapters** for testing (see examples)
- **Measure bundle sizes** when choosing adapters
- **Profile performance** for your specific use case

The modular architecture makes VQP **flexible**, **testable**, and **optimizable** for any use case!
