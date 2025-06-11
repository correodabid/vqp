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
- **Transport Layer**: Protocol-agnostic (HTTP, WebSocket, P2P)
- **Cryptographic Engine**: Ed25519, secp256k1, RSA for signatures

### Key Technologies
- **Languages**: TypeScript/JavaScript (primary), Python, Go, Rust
- **Cryptography**: Ed25519 signatures, zk-SNARKs, Bulletproofs
- **Data**: JSON Schema for vocabularies, JSONLogic for queries
- **Transport**: HTTP/HTTPS, WebSocket, libp2p
- **Standards**: DID (Decentralized Identifiers), JWT-like response format

## Development Guidelines

### Code Style
- **Language**: All development in English (comments, variables, documentation)
- **Naming**: Use camelCase for JavaScript/TypeScript, snake_case for Python, PascalCase for Go
- **Error Handling**: Always include comprehensive error handling with specific error types
- **Security**: Prioritize security in all implementations - validate inputs, use constant-time operations
- **Testing**: Write comprehensive tests including unit, integration, and security tests

### File Structure Patterns
```
/lib/           # Core library implementations
/schemas/       # Vocabulary JSON schemas  
/examples/      # Usage examples and demos
/tools/         # CLI tools and utilities
/tests/         # Test suites
/docs/          # Documentation (already created)
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

## Common Code Patterns

### JSONLogic Evaluation
```typescript
// Safe JSONLogic evaluation with vocabulary validation
function evaluateQuery(query: VQPQuery, vault: DataVault): boolean {
  // 1. Validate vocabulary
  const vocab = await loadVocabulary(query.query.vocab);
  validateQueryAgainstVocabulary(query.query.expr, vocab);
  
  // 2. Extract and validate variables
  const variables = extractVariables(query.query.expr);
  const vaultData = vault.getData(variables);
  
  // 3. Evaluate with timeout and resource limits
  return jsonLogic.apply(query.query.expr, vaultData);
}
```

### Digital Signature Generation
```typescript
// Generate Ed25519 signature for response
function signResponse(response: Omit<VQPResponse, 'proof'>, privateKey: Uint8Array): VQPResponse {
  const payload = {
    queryId: response.queryId,
    result: response.result,
    timestamp: response.timestamp,
    responder: response.responder
  };
  
  const signature = ed25519.sign(
    new TextEncoder().encode(JSON.stringify(payload)),
    privateKey
  );
  
  return {
    ...response,
    proof: {
      type: "signature",
      algorithm: "ed25519",
      publicKey: ed25519.getPublicKey(privateKey),
      signature: bytesToHex(signature)
    }
  };
}
```

### Vocabulary Loading
```typescript
// Load and cache vocabulary schemas
class VocabularyResolver {
  private cache = new Map<string, JSONSchema>();
  
  async loadVocabulary(vocabUri: string): Promise<JSONSchema> {
    if (this.cache.has(vocabUri)) {
      return this.cache.get(vocabUri)!;
    }
    
    const schema = await this.fetchSchema(vocabUri);
    this.validateSchema(schema);
    this.cache.set(vocabUri, schema);
    return schema;
  }
}
```

## Integration Patterns

### HTTP Server
```typescript
// Express.js VQP endpoint
app.post('/vqp/query', async (req, res) => {
  try {
    const query = validateQuery(req.body);
    const response = await responder.handleQuery(query);
    res.json(response);
  } catch (error) {
    res.status(400).json({ 
      error: error.code,
      message: error.message 
    });
  }
});
```

### Microservice Integration
```typescript
// VQP middleware for automatic query handling
function vqpMiddleware(config: VQPConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-type'] === 'application/vqp+json') {
      const response = await handleVQPQuery(req.body, config);
      return res.json(response);
    }
    next();
  };
}
```

## Testing Patterns

### Unit Tests
- Test JSONLogic evaluation with various expressions
- Test signature generation and verification
- Test vocabulary validation
- Test error handling scenarios

### Integration Tests  
- Test full query/response flow
- Test vocabulary resolution
- Test transport protocols
- Test multi-implementation compatibility

### Security Tests
- Test query injection attempts
- Test timing attack resistance
- Test cryptographic operations
- Test access control enforcement

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
- **[Architecture Documentation](../docs/architecture.md)**: System architecture, component design, network protocols, and deployment models
- **[Security Model](../docs/security.md)**: Threat model, cryptographic foundations, attack scenarios, and security implementation guidelines

### Implementation Resources
- **[Use Cases & Examples](../docs/use-cases.md)**: Real-world examples across identity, financial, healthcare, IoT, and enterprise domains
- **[Integration Guide](../docs/integration-guide.md)**: Practical implementation instructions for responders, queriers, and various platforms
- **[Standard Vocabularies](../docs/vocabularies.md)**: Complete vocabulary specifications for identity, financial, health, metrics, compliance, academic, supply chain, and IoT domains

### Project Planning
- **[Development Roadmap](../docs/roadmap.md)**: Timeline, milestones, feature priorities, and research areas

### Key Implementation Guidelines from Documentation

#### From spec.md - Protocol Requirements
- All queries must use JSONLogic v1.0.0 as the query language
- Responses must include cryptographic proofs (signature, zk-snark, or multisig)
- Vocabulary URIs must be resolvable and cacheable
- Support for multiple transport protocols (HTTP, WebSocket, P2P)

#### From architecture.md - System Design
- Implement VQP Node with 6 core components: Query Processor, Response Generator, Data Vault, Crypto Engine, Network Layer, Vocabulary Resolver
- Use AES-256-GCM for data encryption, Ed25519 for signatures
- Target performance: <100ms query processing, 1000+ QPS throughput
- Support multiple discovery mechanisms: DNS-based, DHT-based, Registry-based

#### From security.md - Security Implementation
- Always validate queries against vocabulary schemas to prevent injection attacks
- Implement constant-time operations to prevent timing attacks
- Use privacy budgets to prevent correlation attacks
- Support post-quantum cryptography preparation (future-proofing)
- Implement comprehensive audit logging

#### From vocabularies.md - Vocabulary Standards
- Use snake_case for field names, follow JSON Schema Draft 2020-12
- Standard vocabulary URIs format: `https://vqp.dev/vocab/{domain}/v{version}`
- Support 8 core vocabularies: identity, financial, health, metrics, compliance, academic, supply-chain, iot
- Custom vocabularies must follow naming conventions and provide clear descriptions

#### From integration-guide.md - Implementation Patterns
- Support multiple platforms: Node.js, Python, Go, Rust
- Provide middleware patterns for Express.js, FastAPI, Go HTTP
- Include Docker/Kubernetes deployment configurations
- Implement comprehensive error handling with specific error codes

#### From use-cases.md - Practical Examples
- Age verification without exposing birth date
- Income verification for loans without sharing bank statements
- Health status verification without medical record access
- System metrics verification without exposing internal data
- Supply chain verification without revealing proprietary information

When generating code for this project, prioritize security, performance, and adherence to the VQP specification. Always include proper error handling and follow the established patterns for consistency across the codebase. Refer to the documentation above for detailed implementation guidance and examples.