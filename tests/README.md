# VQP Integration Tests

This directory contains **integration and end-to-end tests** for the VQP system. These tests verify the complete system behavior when multiple packages work together.

## Test Organization

### Unit Tests vs Integration Tests

- **Unit Tests**: Located in each package's `src/` directory (e.g., `packages/core/src/*.test.ts`)
  - Test individual adapters and components in isolation
  - Use mock dependencies and test ports independently
  - Run with each package's own test command

- **Integration Tests**: Located in this `/tests/integration/` directory
  - Test complete VQP workflows end-to-end
  - Use real adapters working together
  - Verify cross-package interactions and data flow
  - Test system behavior under realistic conditions

### Integration Test Categories

#### 1. End-to-End Flow Tests (`e2e-flow.test.ts`)
Tests complete query/response cycles:
- Query creation and validation
- Data access and evaluation
- Cryptographic proof generation
- Response verification
- Multi-step workflows

#### 2. System Integration Tests (`vqp-system.test.ts`)
Tests system-level functionality:
- Multiple adapter combinations
- Configuration scenarios
- Error handling across components
- Performance under load

#### 3. Comprehensive Flow Tests (`comprehensive-flow.test.ts`)
Tests complex real-world scenarios:
- Multiple concurrent queries
- Different vocabulary types
- Various proof systems (signatures, ZK-SNARKs)
- Cross-domain data access

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
node --import=tsx --test tests/integration/e2e-flow.test.ts

# Run with coverage
npm run test:integration:coverage
```

## Test Environment

Integration tests use:
- **Real file system** for data storage (temporary test files)
- **Real cryptographic operations** (Ed25519, ZK-SNARKs)
- **Real vocabulary resolution** (with test schemas)
- **Temporary audit logs** (cleaned up after tests)

## Adding New Integration Tests

When adding system-level functionality:

1. **Add unit tests** in the relevant package's `src/` directory
2. **Add integration tests** here for cross-package scenarios
3. **Update examples** in `/examples/` to demonstrate usage

### Example Integration Test Structure

```typescript
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { VQPService } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';

describe('New Feature Integration', () => {
  test('should work end-to-end', async () => {
    // Setup real adapters
    const dataAdapter = createFileSystemDataAdapter('./test-vault.json');
    const cryptoAdapter = createSoftwareCryptoAdapter('./test-keys/');
    
    // Create complete system
    const vqpService = new VQPService(dataAdapter, cryptoAdapter, ...);
    
    // Test complete workflow
    const query = buildTestQuery();
    const response = await vqpService.processQuery(query);
    
    // Verify end-to-end behavior
    assert.ok(response.result);
    assert.ok(response.proof);
  });
});
```

## Design Philosophy

Integration tests focus on:
- **System behavior** rather than implementation details
- **Real-world scenarios** rather than isolated components  
- **Cross-package interactions** rather than single-package functionality
- **User workflows** rather than internal APIs

This ensures the VQP system works correctly as a complete solution while maintaining fast, focused unit tests in each package.
