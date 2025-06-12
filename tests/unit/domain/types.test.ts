import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('VQP Types and Core Functionality', () => {
  it('should import and use VQP types correctly', async () => {
    const { VQPErrorType } = await import('../../../lib/domain/types.js');
    
    // Test VQP error types
    assert.strictEqual(VQPErrorType.INVALID_QUERY, 'INVALID_QUERY');
    assert.strictEqual(VQPErrorType.EVALUATION_ERROR, 'EVALUATION_ERROR');
    assert.strictEqual(VQPErrorType.SIGNATURE_FAILED, 'SIGNATURE_FAILED');
    assert.strictEqual(VQPErrorType.VOCABULARY_NOT_FOUND, 'VOCABULARY_NOT_FOUND');
    assert.strictEqual(VQPErrorType.UNAUTHORIZED, 'UNAUTHORIZED');
  });

  it('should create and validate VQP queries', async () => {
    const { validateVQPQuery } = await import('../../../lib/domain/types.js');
    
    const validQuery = {
      id: 'test-query-123',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:test.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ 'var': 'age' }, 18] }
      }
    };

    const result = validateVQPQuery(validQuery);
    assert.strictEqual(result.valid, true, 'Valid query should pass validation');
  });

  it('should create and validate VQP responses', async () => {
    const { validateVQPResponse } = await import('../../../lib/domain/types.js');
    
    const validResponse = {
      queryId: 'test-query-123',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      responder: 'did:web:responder.com',
      result: true,
      proof: {
        type: 'signature',
        algorithm: 'ed25519',
        publicKey: 'test_public_key',
        signature: 'test_signature'
      }
    };

    const result = validateVQPResponse(validResponse);
    assert.strictEqual(result.valid, true, 'Valid response should pass validation');
  });

  it('should validate timestamps correctly', async () => {
    const { isValidTimestamp } = await import('../../../lib/domain/types.js');
    
    const now = new Date().toISOString();
    const futureTime = new Date(Date.now() + 60000).toISOString(); // 1 minute future
    const pastTime = new Date(Date.now() - 60000).toISOString(); // 1 minute past
    const veryOldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago

    assert.strictEqual(isValidTimestamp(now), true, 'Current timestamp should be valid');
    assert.strictEqual(isValidTimestamp(pastTime), true, 'Recent past timestamp should be valid');
    assert.strictEqual(isValidTimestamp(futureTime), true, 'Near future timestamp should be valid');
    assert.strictEqual(isValidTimestamp(veryOldTime), false, 'Very old timestamp should be invalid');
  });

  it('should handle error creation properly', async () => {
    const { createVQPError, VQPErrorType } = await import('../../../lib/domain/types.js');
    
    const error = createVQPError(
      VQPErrorType.INVALID_QUERY,
      'Test error message',
      { field: 'test_field' }
    );

    assert.strictEqual(error.code, VQPErrorType.INVALID_QUERY);
    assert.strictEqual(error.message, 'Test error message');
    assert.strictEqual(error.details?.field, 'test_field');
  });
});
