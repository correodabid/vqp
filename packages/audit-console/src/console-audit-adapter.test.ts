/**
 * Tests for Console Audit Adapter
 * Demonstrates Node.js native test runner with VQP audit functionality
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ConsoleAuditAdapter } from './console-adapter.js';
import type { VQPQuery, VQPResponse } from '@vqp/core';
import { VQPError } from '@vqp/core';

describe('Console Audit Adapter', () => {
  test('should create instance without errors', () => {
    const adapter = new ConsoleAuditAdapter();
    assert.ok(adapter, 'Adapter should be created successfully');
  });

  test('should log query without throwing errors', async () => {
    const adapter = new ConsoleAuditAdapter();

    const mockQuery: VQPQuery = {
      id: 'test-query-id',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:test:requester',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ var: 'age' }, 18] },
      },
    };

    const mockResponse: VQPResponse = {
      queryId: 'test-query-id',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      responder: 'did:test:responder',
      result: true,
      proof: {
        type: 'signature',
        algorithm: 'ed25519',
        publicKey: 'test-public-key',
        signature: 'test-signature',
      },
    };

    // Should not throw
    await assert.doesNotReject(
      async () => await adapter.logQuery(mockQuery, mockResponse),
      'logQuery should not throw errors'
    );
  });

  test('should log error without throwing', async () => {
    const adapter = new ConsoleAuditAdapter();
    const testError = new VQPError('EVALUATION_ERROR', 'Test error');
    const testContext = { operation: 'test' };

    // Should not throw
    await assert.doesNotReject(
      async () => await adapter.logError(testError, testContext),
      'logError should not throw errors'
    );
  });
});
