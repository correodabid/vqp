# VQP (Verifiable Query Protocol) - GitHub Copilot Instructions

This file provides context and guidelines for GitHub Copilot when working on the Verifiable Query Protocol (VQP) project.

## Project Overview

VQP is an open protocol that enables privacy-preserving, verifiable queries over private data. It allows systems to respond to structured questions without exposing the underlying data, providing cryptographically verifiable responses.

**Current Status (June 2025)**: 
- ✅ Protocol specification v1.0 complete
- ✅ Modular package architecture implemented  
- ✅ ZK-SNARK integration working
- ✅ Complete documentation and examples
- ✅ Production-ready TypeScript implementation

### Core Philosophy
- **Ask without accessing**: Query data without requiring direct access
- **Prove without revealing**: Provide verifiable answers without exposing raw data  
- **Verify without trusting**: Cryptographic proofs eliminate need for blind trust

## Technical Architecture

### Core Components
- **Query Language**: JSONLogic-based expressions for safe, deterministic evaluation
- **Vocabularies**: Standardized schemas defining queryable data fields
- **Proof Systems**: Digital signatures, ZK-SNARKs, and multi-signature support
- **Cryptographic Engine**: Ed25519, secp256k1, RSA for signatures

### Key Technologies
- **Languages**: TypeScript/JavaScript (primary), Python, Go, Rust
- **Cryptography**: Ed25519 signatures, zk-SNARKs, Bulletproofs
- **Data**: JSON Schema for vocabularies, JSONLogic for queries
- **Standards**: DID (Decentralized Identifiers), JWT-like response format

### Hexagonal Architecture
VQP follows hexagonal architecture (ports and adapters) principles:
- **Core Domain**: Business logic is isolated from external concerns
- **Ports**: Define interfaces for external interactions
- **Adapters**: Implement specific technologies (HTTP, databases, crypto)
- **Benefits**: Testability, technology independence, extensibility

## Development Guidelines

### Code Style
- **Language**: All development in English (comments, variables, documentation)
- **Architecture**: Always implement hexagonal architecture patterns
- **Naming**: Use camelCase for JavaScript/TypeScript, snake_case for Python, PascalCase for Go
- **Error Handling**: Always include comprehensive error handling with specific error types
- **Security**: Prioritize security in all implementations - validate inputs, use constant-time operations
- **Testing**: Write comprehensive tests including unit, integration, and security tests

### Hexagonal Architecture Implementation

#### Always Define Ports First
```typescript
// Define the interface (port) before implementation
interface DataAccessPort {
  getData(path: string[]): Promise<any>;
  validateDataAccess(path: string[], requester: string): Promise<boolean>;
}

// Then implement adapters
class FileSystemDataAdapter implements DataAccessPort {
  // Implementation details
}

class DatabaseDataAdapter implements DataAccessPort {
  // Different implementation, same interface
}
```

#### Core VQP Service Structure
```typescript
class VQPService {
  constructor(
    private dataAccess: DataAccessPort,
    private crypto: CryptographicPort,
    private vocabulary: VocabularyPort,
    private audit: AuditPort
  ) {}
  
  // Pure business logic, no external dependencies
  async processQuery(query: VQPQuery): Promise<VQPResponse> {
    // Domain logic here
  }
}
```

#### Dependency Injection Pattern
```typescript
// Configuration assembles the system
function createVQPService(config: VQPConfig): VQPService {
  const dataAdapter = createDataAdapter(config.data);
  const cryptoAdapter = createCryptoAdapter(config.crypto);
  const vocabAdapter = createVocabularyAdapter(config.vocabulary);
  const auditAdapter = createAuditAdapter(config.audit);
  
  return new VQPService(dataAdapter, cryptoAdapter, vocabAdapter, auditAdapter);
}
```

### File Structure Patterns
```
/packages/      # Modular VQP implementation (current architecture)
  /core/        # Core domain logic and ports
  /data-*/      # Data adapter implementations
  /crypto-*/    # Cryptographic adapter implementations  
  /audit-*/     # Audit adapter implementations
  /evaluation-*/# Query evaluation adapters
  /vocab-*/     # Vocabulary resolver adapters
/examples/      # Working demonstrations and use cases
/circuits/      # ZK-SNARK circuits and proving keys
/tools/         # CLI tools and utilities
/tests/         # End-to-end and integration tests only
  /integration/ # Full system integration tests
/docs/          # Complete documentation
/coverage/      # Test coverage reports
/logs/          # Runtime logs
/scripts/       # Build and deployment scripts
/types/         # TypeScript type definitions
```

### Current Package Architecture
The project uses a **modular package system** with clear separation of concerns:

**Core Packages:**
- `@vqp/core` - Domain logic, ports, and orchestration
- `@vqp/evaluation-jsonlogic` - JSONLogic query evaluation
- `@vqp/crypto-software` - Software-based cryptography (Ed25519)
- `@vqp/crypto-snarkjs` - ZK-SNARK proof generation and verification
- `@vqp/data-filesystem` - File-based data storage
- `@vqp/data-encrypted` - Encrypted data storage with AES-256-GCM
- `@vqp/audit-console` - Console audit logging
- `@vqp/audit-file` - File-based audit logging
- `@vqp/audit-memory` - In-memory audit logging for testing
- `@vqp/vocab-http` - HTTP vocabulary resolution with caching

### Standard Vocabularies
When implementing vocabulary support, use these standard domains:
- `vqp:identity:v1` - Personal identity verification (age, citizenship, credentials)
- `vqp:financial:v1` - Financial information (income, employment, credit)
- `vqp:health:v1` - Health data (vaccinations, conditions, insurance)
- `vqp:metrics:v1` - System metrics (uptime, performance, health status)
- `vqp:compliance:v1` - Compliance and certifications
- `vqp:academic:v1` - Academic credentials and enrollment
- `vqp:supply-chain:v1` - Supply chain verification
- `vqp:iot:v1` - IoT device metrics and status

## Implementation Patterns

### Current Modular Architecture
The project uses a **workspace-based package system** where each adapter is its own npm package:

```typescript
// Using the modular system
import { VQPService, QueryBuilder } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

// Compose the system
const vqpService = new VQPService(
  createFileSystemDataAdapter('./vault.json'),
  createSoftwareCryptoAdapter('./keys/'),
  createJSONLogicAdapter(),
  createConsoleAuditAdapter()
);
```

### Working Examples
The project includes complete, runnable examples in `/examples/`:

1. **`01-basic-age-verification.ts`** - Essential workflow demonstration
2. **`02-complete-system.ts`** - Production-ready multi-domain service
3. **`03-zk-proof.ts`** - Zero-knowledge proof generation and verification
4. **`04-iot-edge.ts`** - IoT device integration patterns
5. **`05-custom-adapters.ts`** - Custom adapter implementation guide

**Supporting Files:**
- `sample-vault.json` - Example data vault structure
- `access-policies.json` - Access control policy examples
- `README.md` - Complete example documentation

### Query Structure
```typescript
interface VQPQuery {
  id: string;                    // UUID v4
  version: string;               // "1.0.0"
  timestamp: string;             // ISO 8601
  requester: string;             // DID of querier
  target?: string;               // DID of responder (optional for broadcast)
  query: {
    lang: "jsonlogic@1.0.0";    // Query language version
    vocab: string;               // Vocabulary URI
    expr: object;                // JSONLogic expression
  };
}
```

### Response Structure
```typescript
interface VQPResponse {
  queryId: string;               // Reference to original query
  version: string;               // VQP version
  timestamp: string;             // Response timestamp
  responder: string;             // DID of responder
  result: boolean | number | string; // Query result
  proof: {
    type: "signature" | "zk-snark" | "multisig";
    algorithm?: string;          // Signature algorithm
    publicKey?: string;          // Public key for verification
    signature?: string;          // Digital signature
    // ... other proof-specific fields
  };
}
```

### Hexagonal Architecture Examples

#### Crypto Adapter (Software)
```typescript
class SoftwareCryptoAdapter implements CryptographicPort {
  async sign(data: Buffer, keyId: string): Promise<Signature> {
    const privateKey = await this.getPrivateKey(keyId);
    return ed25519.sign(data, privateKey);
  }
  
  async verify(signature: Signature, data: Buffer, publicKey: string): Promise<boolean> {
    return ed25519.verify(signature.value, data, publicKey);
  }
}
```

#### Data Adapter (File System)
```typescript
class FileSystemDataAdapter implements DataAccessPort {
  constructor(private vaultPath: string) {}
  
  async getData(path: string[]): Promise<any> {
    const vault = await this.loadVault();
    return this.extractNestedData(vault, path);
  }
  
  async validateDataAccess(path: string[], requester: string): Promise<boolean> {
    const policies = await this.loadAccessPolicies();
    return this.checkAccess(policies, path, requester);
  }
}
```

### Testing with Hexagonal Architecture

#### Mock Adapters for Testing
```typescript
class MockDataAdapter implements DataAccessPort {
  constructor(private mockData: any) {}
  
  async getData(path: string[]): Promise<any> {
    return this.extractData(this.mockData, path);
  }
  
  async validateDataAccess(): Promise<boolean> {
    return true; // Always allow in tests
  }
}

// Test becomes simple with Node.js native test runner
import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('VQP Service', () => {
  test('should process age query', async () => {
    const mockData = new MockDataAdapter({ age: 25 });
    const mockCrypto = new MockCryptoAdapter();
    const service = new VQPService(mockData, mockCrypto, ...);
    
    const response = await service.processQuery(ageQuery);
    assert.strictEqual(response.result, true);
  });
});

// Tests are executed with: find src -name '*.test.ts' -exec node --import=tsx --test {} +
// No compilation needed, *.test.ts files are excluded from build
```

### Security Patterns
- **Input Validation**: Always validate queries against vocabulary schemas
- **Sandboxing**: Evaluate queries in isolated environments
- **Rate Limiting**: Implement query rate limiting to prevent abuse
- **Constant Time**: Use constant-time operations for sensitive data evaluation
- **Key Management**: Secure private key storage and rotation

### Error Handling
```typescript
interface VQPError {
  code: "INVALID_QUERY" | "EVALUATION_ERROR" | "SIGNATURE_FAILED" | "VOCABULARY_NOT_FOUND" | "UNAUTHORIZED";
  message: string;
  details?: object;
}
```

## Hexagonal Architecture Benefits for VQP

### 1. Technology Independence
- **Storage Agnostic**: File systems, databases, cloud storage, HSMs
- **Crypto Agnostic**: Different signature algorithms, ZK proof systems

### 2. Testing Excellence
- Easy unit testing with mock adapters
- Integration testing with real adapters
- Clear separation of concerns

### 3. Platform Adaptability
- Cloud Functions with lightweight adapters
- Edge devices with embedded adapters
- Enterprise systems with existing infrastructure adapters

### 4. Evolution Support
- Add new proof systems without core changes
- Integrate with new storage technologies

### Current Implementation Status

### ✅ Completed Features
- **Core VQP Protocol**: Full specification implementation
- **Modular Architecture**: Complete hexagonal architecture with adapter pattern
- **Package System**: 9 published packages with clean interfaces
- **Cryptographic Proofs**: Both digital signatures and ZK-SNARKs working
- **Working Examples**: 5 complete examples demonstrating real use cases
- **Documentation**: Complete specification, guides, and API docs
- **Testing Infrastructure**: Unit and integration tests with coverage reporting
- **ZK-SNARK Circuits**: Age verification circuit implemented and tested

### 🚧 Current Development Focus
- Performance optimization and benchmarking
- Additional vocabulary standardization
- More cryptographic adapter implementations
- Production deployment guides
- Community ecosystem development

### 🏗️ Architecture Highlights
The project successfully implements:
- **Hexagonal Architecture**: Clean separation between domain and infrastructure
- **Modular Packages**: Each adapter is independently testable and deployable  
- **Type Safety**: Full TypeScript implementation with comprehensive types
- **Zero Dependencies Core**: Core domain logic has no external dependencies
- **Adapter Ecosystem**: Easy to extend with new storage, crypto, or audit systems

## Dependencies

### Core Dependencies (Latest Implemented)
- `@noble/ed25519` - Ed25519 cryptography (used in crypto-software and crypto-snarkjs)
- `snarkjs` - ZK-SNARK proof generation (used in crypto-snarkjs)

### Built-in Node.js Dependencies
- `node:crypto` - UUID generation (`randomUUID`) and cryptographic operations
- `node:fs` - File system operations
- `node:test` - Native test runner (no Jest dependency)

### Custom Implementations
- **JSONLogic Engine**: Optimized in-house implementation in `@vqp/evaluation-jsonlogic`
- **UUID Generation**: Using native `node:crypto.randomUUID()` 
- **Test Framework**: Node.js native test runner with TypeScript support via `tsx`

### Development Dependencies
- `typescript` - Type checking
- `eslint` - Code linting
- `prettier` - Code formatting
- `tsx` - TypeScript execution for examples
- `typedoc` - API documentation generation
- `tsx` - TypeScript execution for examples
- `typedoc` - API documentation generation

**Note**: We use Node.js native test runner (`node --test`) instead of Jest for better performance and fewer dependencies.

### Project Tooling
**Build & Development:**
- `npm run build` - Build all packages
- `npm run test` - Run all tests with coverage
- `npm run example` - Execute TypeScript examples directly
- `npm run lint` - Code quality checks
- `npm run format` - Code formatting

**ZK-SNARK Circuits:**
- Complete age verification circuit in `/circuits/`
- Pre-compiled proving keys and verification keys
- Witness generation and proof creation tools
- Setup script: `tools/setup-snarkjs.sh`

**Testing & Coverage:**
- **Unit tests**: Located in each package's `src/` directory using `*.test.ts` pattern
- **Integration tests**: Located in `/tests/integration/` for end-to-end system testing
  - `e2e-flow.test.ts` - Basic end-to-end VQP workflows
  - `comprehensive-flow.test.ts` - Complex multi-domain scenarios  
  - `vqp-system.test.ts` - System integration and Node.js functionality
- All tests use Node.js native test runner with TypeScript support via `tsx`
- Test files are excluded from compilation in each package's `tsconfig.json`
- Unit test command per package: `find src -name '*.test.ts' -exec node --import=tsx --test {} +`
- Integration test command: `npm run test:integration` (runs tests in `/tests/integration/`)
- Coverage reports generated in `/coverage/` with detailed HTML reports
- Continuous testing with file watching support

**Test Organization:**
- **Package-level**: Each adapter has its own unit tests testing the specific port implementation
- **Integration-level**: `/tests/integration/` contains end-to-end flows testing complete system interactions
- **Example-level**: `/examples/` directory contains working demonstrations that serve as integration tests

**Note**: We use Node.js native test runner (`node --test`) instead of Jest for better performance and fewer dependencies.

### Workspace Structure
The project uses npm workspaces with lerna-style package management:
```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

### Project Tooling
**Build & Development:**
- `npm run build` - Build all packages
- `npm run test` - Run all tests with coverage
- `npm run example` - Execute TypeScript examples directly
- `npm run lint` - Code quality checks
- `npm run format` - Code formatting

## Performance Considerations

- **Query Evaluation**: Target <100ms for simple queries
- **Signature Generation**: Target <10ms for Ed25519
- **Memory Usage**: Limit query evaluation memory
- **Network**: Use compression for large vocabularies
- **Caching**: Cache vocabulary schemas and compiled queries

## Security Considerations

- **Never log sensitive data** in query evaluations
- **Validate all inputs** against schemas
- **Use secure random** for nonces and keys
- **Implement rate limiting** on all endpoints
- **Regular security audits** of cryptographic operations

## Reference Documentation

The project includes comprehensive documentation in the `/docs` folder. When implementing VQP features, refer to these documents:

### Core Specifications
- **[Protocol Specification](../docs/spec.md)**: Complete technical protocol specification including message formats, proof types, and vocabulary system
- **[Architecture Documentation](../docs/architecture.md)**: System architecture, component design, network protocols, and deployment models including hexagonal architecture implementation
- **[Security Model](../docs/security.md)**: Threat model, cryptographic foundations, attack scenarios, and security implementation guidelines

### Implementation Resources
- **[Use Cases & Examples](../docs/use-cases.md)**: Real-world examples across identity, financial, healthcare, IoT, and enterprise domains
- **[Integration Guide](../docs/integration-guide.md)**: Practical implementation instructions for responders, queriers, and various platforms
- **[Standard Vocabularies](../docs/vocabularies.md)**: Complete vocabulary specifications for identity, financial, health, metrics, compliance, academic, supply chain, and IoT domains

### Project Planning
- **[Development Roadmap](../docs/roadmap.md)**: Timeline, milestones, feature priorities, and research areas

When generating code for this project:

1. **Always use hexagonal architecture** - define ports first, then implement adapters
2. **Prioritize security, performance, and adherence** to the VQP specification
3. **Include proper error handling** and follow established patterns
4. **Write testable code** using dependency injection and mock adapters
5. **Maintain technology independence** by keeping business logic separate from external concerns

Refer to the documentation above for detailed implementation guidance and examples.
