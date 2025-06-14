# VQP Examples

This directory contains examples demonstrating how to use the Verifiable Query Protocol (VQP) library.

## Recommended Approach: Simplified & Protocol-Focused

**`quickstart-simplified.ts`** - Shows the recommended approach using QueryBuilder directly without complex state management
**`simplified-approach-demo.ts`** - Demonstrates why simpler is better for protocols
**`protocol-extensibility-demo.ts`** - Comprehensive demo of protocol extensibility across all domains

## Core Philosophy Examples

**`generic-query-builder.ts`** - Shows how to use the extensible QueryBuilder without predefined domain-specific methods. This is the recommended approach as it keeps the protocol generic and allows any vocabulary to be used.

**`custom-query-extensions.ts`** - Shows how to create domain-specific helper functions and query factories while keeping the core protocol generic.

Key features:
- Generic comparison methods (`compare`, `and`, `or`, `in`)
- Raw expression support (`fromExpression`)
- Fluent interface for complex queries
- Examples across multiple vocabularies
- Shows how to extend with custom helper functions
- Demonstrates plugin architecture patterns

## Legacy Examples (For Reference)

**`quickstart.ts`** - Original approach (consider migrating to VQPSystem-based approach)
**`basic-example.ts`** - Simple age verification example
**`complete-example.ts`** - End-to-end example with multiple query types

## Advanced Features

**`complete-zk-example.ts`** - Zero-knowledge proof integration
**`zk-proof-example.ts`** - ZK-SNARK proof generation and verification

## Data Adapters

**`encrypted-adapter-example.ts`** - Using encrypted data storage
**`file-audit-example.ts`** - File-based audit logging
**`memory-audit-example.ts`** - In-memory audit logging
**`vqp-system-memory-audit.ts`** - System integration with memory audit

## Configuration

**`sample-vault.json`** - Example data vault structure
**`access-policies.json`** - Example access control policies

## Running Examples

```bash
# Install dependencies
npm install

# Run the recommended simplified examples
npm run build && npx tsx examples/quickstart-simplified.ts
npm run build && npx tsx examples/protocol-extensibility-demo.ts
npm run build && npx tsx examples/generic-query-builder.ts

# Run other examples
npm run build && npx tsx examples/custom-query-extensions.ts
npm run build && npx tsx examples/complete-example.ts
```

## Protocol Philosophy

VQP is designed as an extensible protocol, not a rigid framework. The approach prioritizes:

### ✅ What We Recommend
- **Direct QueryBuilder usage**: No complex state management
- **Pure functions**: Stateless query building and verification
- **Protocol compliance**: Follow VQP specification without artificial limitations
- **Helper functions**: Create domain-specific helpers outside the core
- **Single responsibility**: Each component does one thing well

### ❌ What We Avoid
- **Stateful session management**: Protocols should be stateless
- **Framework complexity**: Keep the core simple
- **Opinionated patterns**: Let developers choose their patterns
- **Artificial limitations**: Don't restrict what queries can be built

### Core Components
- **QueryBuilder**: Generic, extensible query construction
- **VQPVerifier**: Response verification
- **VQPService**: Query processing (responder side)
- **Adapters**: Pluggable implementations (crypto, data, etc.)

The protocol defines the structure and semantics, but the specific usage patterns are up to you!
