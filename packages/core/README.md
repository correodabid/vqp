# @vqp/core

Core VQP protocol implementation - adapter-agnostic business logic.

## Overview

The `@vqp/core` package contains the pure business logic for the Verifiable Query Protocol (VQP). It provides the core domain services, types, and interfaces without any external dependencies on specific adapters or implementations.

## Features

- **VQPService**: Core service for processing queries and generating responses
- **VQPVerifier**: Service for verifying responses and cryptographic proofs
- **QueryBuilder**: Fluent interface for building VQP queries with Response Modes v1.1
- **Response Modes**: Strict, Consensual, Reciprocal, and Obfuscated response types
- **Port Interfaces**: Clean interfaces for adapters (Hexagonal Architecture)
- **Type Definitions**: Complete TypeScript types for VQP protocol
- **Zero Dependencies**: Only uses Node.js built-in modules

## Installation

```bash
npm install @vqp/core
```

## Basic Usage

```typescript
import { VQPService, VQPQuery } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

// Create adapters
const dataAdapter = await createFileSystemDataAdapter({ 
  vaultPath: './vault.json' 
});
const cryptoAdapter = await createSoftwareCryptoAdapter({
  keyPath: './keys/private.key'
});
const auditAdapter = await createConsoleAuditAdapter();
const evalAdapter = await createJSONLogicAdapter();

// Create VQP service (vocabulary adapter is optional)
const vqpService = new VQPService(
  dataAdapter,
  cryptoAdapter,
  evalAdapter,
  auditAdapter,
  undefined // No vocabulary adapter - pass vocabularies directly
);

// Define vocabularies directly
const vocabularies = {
  'vqp:identity:v1': {
    type: 'object',
    properties: {
      age: { type: 'integer', minimum: 0, maximum: 150 },
      citizenship: { type: 'string', pattern: '^[A-Z]{2}$' }
    }
  }
};

// Process a query
const query: VQPQuery = {
  id: crypto.randomUUID(),
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  requester: 'did:web:example.com',
  query: {
    lang: 'jsonlogic@1.0.0',
    vocab: 'vqp:identity:v1',
    expr: { '>=': [{ 'var': 'age' }, 18] }
  }
};

const response = await vqpService.processQuery(query, vocabularies);
console.log('Query result:', response.result);
```

## Response Modes v1.1

The QueryBuilder supports four response modes for flexible data disclosure:

```typescript
import { QueryBuilder } from '@vqp/core';

// Strict mode - boolean only (default)
const strictQuery = new QueryBuilder()
  .requester('did:web:service.com')
  .vocabulary('vqp:identity:v1')
  .expression({ '>=': [{ 'var': 'age' }, 18] })
  .strict()
  .build();

// Consensual mode - reveals values with consent
const consensualQuery = new QueryBuilder()
  .requester('did:web:bank.com')
  .vocabulary('vqp:financial:v1')
  .expression({ 'var': 'annual_income' })
  .consensual()
  .build();

// Reciprocal mode - mutual verification
const reciprocalQuery = new QueryBuilder()
  .requester('did:web:vendor.com')
  .vocabulary('vqp:compliance:v1')
  .expression({ 'in': ['ISO-27001', { 'var': 'certifications_active' }] })
  .reciprocal()
  .build();

// Obfuscated mode - privacy-preserving values
const obfuscatedQuery = new QueryBuilder()
  .requester('did:web:customer.com')
  .vocabulary('vqp:metrics:v1')
  .expression({ 'var': 'uptime_percentage_24h' })
  .obfuscated('range') // or 'noise'
  .build();
```

## What's Included

- `VQPService` - Core service for processing queries
- `VQPVerifier` - Service for verifying responses  
- Port interfaces (`DataAccessPort`, `CryptographicPort`, `AuditPort`, etc.)
- Core types (`VQPQuery`, `VQPResponse`, `VQPError`, etc.)

## What's NOT Included

- No specific adapters (use separate packages)
- No vocabulary resolution (pass vocabularies directly or use `@vqp/vocab-*`)
- No concrete implementations

## Usage

```typescript
import { VQPService, DataAccessPort, CryptographicPort, AuditPort, QueryEvaluationPort } from '@vqp/core';

// You provide the adapters
const dataAdapter: DataAccessPort = // your implementation
const cryptoAdapter: CryptographicPort = // your implementation  
const auditAdapter: AuditPort = // your implementation
const queryAdapter: QueryEvaluationPort = // your implementation

const vqpService = new VQPService(
  dataAdapter,
  cryptoAdapter, 
  auditAdapter,
  queryAdapter
);

// Process queries with direct vocabulary provision
const vocabulary = { /* your vocabulary schema */ };
const response = await vqpService.processQuery(query, vocabulary);
```

## Philosophy

This core package follows the principle that **applications should control their own dependencies**. Instead of bundling all possible adapters, applications choose exactly what they need:

- Simple apps: Implement minimal adapters or pass data directly
- Complex apps: Use rich adapter packages (`@vqp/data-filesystem`, `@vqp/crypto-hsm`, etc.)
- Custom apps: Build custom adapters implementing the port interfaces

This results in smaller bundles and more flexibility.
