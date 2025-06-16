/**
 * Example test file using Node.js native test runner
 * This demonstrates the new testing pattern for VQP packages
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Example test for VQP Core functionality
describe('VQP Core Example Tests', () => {
  test('should demonstrate Node.js native test runner', async () => {
    // Example assertion using Node.js assert
    const result = true;
    assert.strictEqual(result, true, 'Basic assertion should pass');
  });

  test('should handle async operations', async () => {
    // Example async test
    const asyncResult = await Promise.resolve('success');
    assert.strictEqual(asyncResult, 'success', 'Async assertion should pass');
  });

  test('should validate VQP query structure', () => {
    const mockQuery = {
      id: 'test-query-id',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:example:requester',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 18] },
      },
    };

    // Validate required fields
    assert.ok(mockQuery.id, 'Query should have an ID');
    assert.ok(mockQuery.version, 'Query should have a version');
    assert.ok(mockQuery.query.expr, 'Query should have an expression');
  });
});

// Example of testing with mock adapters
describe('VQP Mock Adapter Tests', () => {
  test('should work with mock data adapter', async () => {
    // Example mock implementation
    class MockDataAdapter {
      constructor(private mockData: any) {}

      async getData(path: string[]): Promise<any> {
        let current = this.mockData;
        for (const segment of path) {
          current = current[segment];
        }
        return current;
      }

      async validateDataAccess(): Promise<boolean> {
        return true; // Always allow in tests
      }
    }

    const mockData = new MockDataAdapter({ age: 25, citizenship: 'US' });
    const age = await mockData.getData(['age']);

    assert.strictEqual(age, 25, 'Mock adapter should return correct age');
  });
});
