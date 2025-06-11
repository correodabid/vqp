# VQP Protocol Specification v1.0

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Query Structure](#query-structure)
4. [Response Format](#response-format)
5. [Proof Types](#proof-types)
6. [Vocabulary System](#vocabulary-system)
7. [Security Considerations](#security-considerations)
8. [Implementation Requirements](#implementation-requirements)

## Overview

The Verifiable Query Protocol (VQP) enables secure, privacy-preserving queries over private data with cryptographically verifiable responses. The protocol is designed to be:

- **Sovereign**: Data owners maintain full control
- **Verifiable**: Responses can be cryptographically verified
- **Privacy-preserving**: Original data is never exposed
- **Interoperable**: Works across systems, platforms, and organizations

## Core Concepts

### Entities

- **Querier**: Entity requesting information
- **Responder**: Entity that owns the data and can respond to queries
- **Verifier**: Entity that validates the response (can be the same as Querier)

### Data Flow

```
Querier → Query → Responder
                    ↓ (local evaluation)
                  Response + Proof
                    ↓
Verifier ← Verification ← Response
```

## Query Structure

### Base Query Format

```json
{
  "id": "uuid-v4",
  "version": "1.0.0",
  "timestamp": "2025-06-11T14:44:00Z",
  "requester": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "target": "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "ipfs://bafybeid6vu4qkbkqzv2rbj66cl5rphdsh2mg7s3li3y3rmh34a4sbfjlsu/schema.json",
    "expr": {
      "and": [
        { ">=": [ { "var": "age" }, 18 ] },
        { "==": [ { "var": "citizenship" }, "ES" ] }
      ]
    }
  }
}
```

### Fields

- `id`: Unique identifier for the query
- `version`: VQP version being used
- `timestamp`: When the query was created (ISO 8601)
- `requester`: DID of the entity making the query
- `target`: DID of the entity being queried (optional for broadcast queries)
- `query.lang`: Query language specification
- `query.vocab`: URI to vocabulary/schema definition
- `query.expr`: The actual query expression

### Supported Query Languages

#### JSONLogic v1.0.0

JSONLogic provides a safe, deterministic way to express logical conditions:

```json
{
  "lang": "jsonlogic@1.0.0",
  "expr": {
    "and": [
      { ">": [ { "var": "metrics.processed_events" }, 1000 ] },
      { "==": [ { "var": "status.health" }, "healthy" ] }
    ]
  }
}
```

Supported operations:
- Logical: `and`, `or`, `not`
- Comparison: `==`, `!=`, `>`, `>=`, `<`, `<=`
- Arithmetic: `+`, `-`, `*`, `/`
- Array: `in`, `map`, `filter`
- Conditional: `if`
- Variable access: `var`

## Response Format

### Base Response Structure

```json
{
  "queryId": "uuid-v4-of-original-query",
  "version": "1.0.0",
  "timestamp": "2025-06-11T14:45:00Z",
  "responder": "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
  "result": true,
  "proof": {
    "type": "signature",
    "algorithm": "ed25519",
    "publicKey": "z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
    "signature": "0x304402207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a002207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0"
  }
}
```

### Fields

- `queryId`: Reference to the original query
- `version`: VQP version
- `timestamp`: When the response was generated
- `responder`: DID of the responding entity
- `result`: The boolean or value result of the query evaluation
- `proof`: Cryptographic proof of the response

## Proof Types

### 1. Digital Signature

Simple cryptographic signature of the response payload.

```json
{
  "type": "signature",
  "algorithm": "ed25519|secp256k1|rsa",
  "publicKey": "base58-encoded-public-key",
  "signature": "hex-encoded-signature"
}
```

**Payload for signature**:
```json
{
  "queryId": "...",
  "result": true,
  "timestamp": "2025-06-11T14:45:00Z",
  "responder": "..."
}
```

### 2. Zero-Knowledge Proof

Cryptographic proof that demonstrates knowledge without revealing the underlying data.

```json
{
  "type": "zk-snark",
  "circuit": "age_verification_v1.zok",
  "proof": "base64-encoded-zk-proof",
  "publicInputs": {
    "threshold": 18
  }
}
```

### 3. Multi-Signature

Multiple entities providing signatures for the same response.

```json
{
  "type": "multisig",
  "threshold": 2,
  "signatures": [
    {
      "signer": "did:key:abc...",
      "algorithm": "ed25519",
      "signature": "0x..."
    },
    {
      "signer": "did:key:def...",
      "algorithm": "ed25519", 
      "signature": "0x..."
    }
  ]
}
```

## Vocabulary System

### Schema Definition

Vocabularies define the structure and meaning of variables used in queries:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Personal Identity Vocab",
  "description": "Standard vocabulary for personal identity queries",
  "type": "object",
  "properties": {
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150,
      "description": "Age in years"
    },
    "citizenship": {
      "type": "string",
      "pattern": "^[A-Z]{2}$",
      "description": "ISO 3166-1 alpha-2 country code"
    }
  }
}
```

### Standard Vocabularies

#### Core Identity (`vqp:identity:v1`)
- `age`: integer
- `citizenship`: string (ISO 3166-1 alpha-2)
- `has_credential`: boolean

#### System Metrics (`vqp:metrics:v1`)
- `uptime_hours`: integer
- `processed_events`: integer
- `error_rate`: number (0-1)
- `health_status`: enum ["healthy", "degraded", "unhealthy"]

#### Financial (`vqp:financial:v1`)
- `annual_income`: integer
- `tax_jurisdiction`: string
- `has_bank_account`: boolean

## Security Considerations

### Threat Model

1. **Malicious Querier**: May try to extract more information than intended
2. **Malicious Responder**: May provide false information
3. **Man-in-the-Middle**: May intercept or modify communications
4. **Replay Attacks**: May reuse old queries or responses

### Mitigations

1. **Query Isolation**: Each query is evaluated in isolation
2. **Timestamp Validation**: All messages include timestamps to prevent replay
3. **Cryptographic Signatures**: All responses are cryptographically signed
4. **Vocabulary Validation**: Queries must reference valid vocabularies
5. **Rate Limiting**: Responders can implement rate limiting

### Privacy Guarantees

- **Data Minimization**: Only the query result is shared, never raw data
- **Consent**: Responders can choose whether to answer each query
- **Unlinkability**: Multiple queries cannot be linked without explicit correlation

## Implementation Requirements

### For Responders

1. **Query Parser**: Parse and validate VQP queries
2. **Local Evaluator**: Evaluate queries against local data
3. **Cryptographic Module**: Generate signatures or ZK proofs
4. **Vocabulary Resolver**: Fetch and validate vocabulary schemas

### For Queriers/Verifiers

1. **Query Builder**: Construct valid VQP queries
2. **Response Validator**: Verify cryptographic proofs
3. **Vocabulary Resolver**: Understand vocabulary schemas
4. **Transport Layer**: Send queries and receive responses

### Transport Protocols

VQP is transport-agnostic but commonly used over:
- HTTP/HTTPS
- WebSocket
- IPFS/libp2p
- Custom P2P protocols

### Error Handling

Standard error responses:

```json
{
  "error": {
    "code": "INVALID_QUERY|EVALUATION_ERROR|SIGNATURE_FAILED",
    "message": "Human-readable error description",
    "details": {}
  }
}
```

## Extensions

### Future Considerations

1. **Batch Queries**: Multiple queries in a single request
2. **Streaming Responses**: Real-time query results
3. **Query Composition**: Combining multiple sub-queries
4. **Conditional Logic**: Complex branching in queries
5. **Time-based Queries**: Queries over historical data ranges
