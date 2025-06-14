# VQP (Verifiable Query Protocol) - GitHub Copilot Instructions

This file provides context and guidelines for GitHub Copilot when working on the Verifiable Query Protocol (VQP) project.

## Project Overview

VQP is an open protocol that enables privacy-preserving, verifiable queries over private data. It allows systems to respond to structured questions without exposing the underlying data, providing cryptographically verifiable responses.

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
/lib/           # Core library implementations
  /domain/      # Pure business logic (ports and domain services)
  /adapters/    # External system implementations
    /data/      # File system, database adapters
    /crypto/    # Software, HSM crypto adapters
    /vocab/     # HTTP, cache vocabulary adapters
/schemas/       # Vocabulary JSON schemas  
/examples/      # Usage examples and demos
/tools/         # CLI tools and utilities
/tests/         # Test suites
/docs/          # Documentation
```

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

// Test becomes simple
describe('VQP Service', () => {
  it('should process age query', async () => {
    const mockData = new MockDataAdapter({ age: 25 });
    const mockCrypto = new MockCryptoAdapter();
    const service = new VQPService(mockData, mockCrypto, ...);
    
    const response = await service.processQuery(ageQuery);
    expect(response.result).toBe(true);
  });
});
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

## Dependencies

### Core Dependencies
- `jsonlogic-js` - JSONLogic evaluation engine
- `@noble/ed25519` - Ed25519 cryptography
- `ajv` - JSON Schema validation
- `uuid` - UUID generation
- `jose` - JWT and cryptographic operations

### Development Dependencies
- `jest` - Testing framework
- `typescript` - Type checking
- `eslint` - Code linting
- `prettier` - Code formatting

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
