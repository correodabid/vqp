/**
 * Tests for MemoryAuditAdapter
 */

import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { MemoryAuditAdapter } from '../../../../lib/adapters/audit/memory-adapter.js';
import { VQPQuery, VQPResponse, VQPError } from '../../../../lib/domain/types.js';

describe('MemoryAuditAdapter', () => {
  let adapter: MemoryAuditAdapter;
  let mockQuery: VQPQuery;
  let mockResponse: VQPResponse;

  beforeEach(() => {
    adapter = new MemoryAuditAdapter({
      maxEntries: 100,
      includeFullQuery: false,
      includeFullResponse: false
    });

    mockQuery = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      version: '1.0.0',
      timestamp: '2025-06-12T10:00:00Z',
      requester: 'did:web:example.com',
      target: 'did:web:responder.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ 'var': 'age' }, 18] }
      }
    };

    mockResponse = {
      queryId: '123e4567-e89b-12d3-a456-426614174000',
      version: '1.0.0',
      timestamp: '2025-06-12T10:00:01Z',
      responder: 'did:web:responder.com',
      result: true,
      proof: {
        type: 'signature',
        algorithm: 'ed25519',
        publicKey: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        signature: '0x304402207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0'
      }
    };
  });

  it('should log query and response correctly', async () => {
    await adapter.logQuery(mockQuery, mockResponse);

    const entries = await adapter.getAuditTrail();
    assert.equal(entries.length, 1);

    const entry = entries[0];
    assert.equal(entry.event, 'query_processed');
    assert.equal(entry.queryId, mockQuery.id);
    assert.equal(entry.querier, mockQuery.requester);
    assert.equal(entry.result, true);
    assert.equal(entry.metadata?.vocabulary, 'vqp:identity:v1');
    assert.equal(entry.metadata?.responseTime, 1000); // 1 second difference
  });

  it('should include full query and response when configured', async () => {
    const fullAdapter = new MemoryAuditAdapter({
      includeFullQuery: true,
      includeFullResponse: true
    });

    await fullAdapter.logQuery(mockQuery, mockResponse);

    const entries = await fullAdapter.getAuditTrail();
    const entry = entries[0];
    
    assert.deepEqual(entry.metadata?.fullQuery, mockQuery);
    assert.deepEqual(entry.metadata?.fullResponse, mockResponse);
  });

  it('should log errors correctly', async () => {
    const error = new VQPError('INVALID_QUERY', 'Query validation failed', { field: 'age' });
    const context = { queryId: '123', operation: 'validate' };

    await adapter.logError(error, context);

    const entries = await adapter.getAuditTrail();
    assert.equal(entries.length, 1);

    const entry = entries[0];
    assert.equal(entry.event, 'error_occurred');
    assert.equal(entry.error?.code, 'INVALID_QUERY');
    assert.equal(entry.error?.message, 'Query validation failed');
    assert.deepEqual(entry.metadata?.context, context);
  });

  it('should sanitize sensitive context data', async () => {
    const error = new VQPError('SIGNATURE_FAILED', 'Signature verification failed');
    const contextWithSensitiveData = {
      privateKey: 'secret-key',
      password: 'secret-password',
      operation: 'sign',
      publicData: 'safe-data'
    };

    await adapter.logError(error, contextWithSensitiveData);

    const entries = await adapter.getAuditTrail();
    const entry = entries[0];
    
    assert.equal(entry.metadata?.context.privateKey, undefined);
    assert.equal(entry.metadata?.context.password, undefined);
    assert.equal(entry.metadata?.context.operation, 'sign');
    assert.equal(entry.metadata?.context.publicData, 'safe-data');
  });

  it('should filter by querier', async () => {
    await adapter.logQuery(mockQuery, mockResponse);
    
    const query2 = { ...mockQuery, id: 'query-2', requester: 'did:web:other.com' };
    const response2 = { ...mockResponse, queryId: 'query-2', timestamp: '2025-06-12T11:00:00Z' };
    await adapter.logQuery(query2, response2);

    const entries = await adapter.getAuditTrail({
      querier: 'did:web:other.com'
    });
    
    assert.equal(entries.length, 1);
    assert.equal(entries[0].querier, 'did:web:other.com');
  });

  it('should filter by event type', async () => {
    await adapter.logQuery(mockQuery, mockResponse);
    
    const error = new VQPError('INVALID_QUERY', 'Test error');
    await adapter.logError(error, {});

    const entries = await adapter.getAuditTrail({
      event: 'error_occurred'
    });
    
    assert.equal(entries.length, 1);
    assert.equal(entries[0].event, 'error_occurred');
  });

  it('should remove entries older than specified date', async () => {
    await adapter.logQuery(mockQuery, mockResponse);
    
    // Add an older entry by manipulating the timestamp
    const oldQuery = { ...mockQuery, timestamp: '2025-06-10T10:00:00Z' };
    const oldResponse = { ...mockResponse, timestamp: '2025-06-10T10:00:01Z' };
    await adapter.logQuery(oldQuery, oldResponse);

    assert.equal(adapter.getEntryCount(), 2);

    const purgedCount = await adapter.purgeOldEntries('2025-06-11T00:00:00Z');
    assert.equal(purgedCount, 1);
    assert.equal(adapter.getEntryCount(), 1);
  });

  it('should limit entries to maxEntries when autoCleanup is enabled', async () => {
    const limitedAdapter = new MemoryAuditAdapter({
      maxEntries: 2,
      autoCleanup: true
    });

    // Add 3 entries
    for (let i = 0; i < 3; i++) {
      const query = { ...mockQuery, id: `query-${i}` };
      const response = { ...mockResponse, queryId: `query-${i}` };
      await limitedAdapter.logQuery(query, response);
    }

    assert.equal(limitedAdapter.getEntryCount(), 2);
  });

  it('should provide memory usage statistics', () => {
    const stats = adapter.getMemoryStats();
    
    assert.ok(stats.hasOwnProperty('entryCount'));
    assert.ok(stats.hasOwnProperty('maxEntries'));
    assert.ok(stats.hasOwnProperty('memoryUsageBytes'));
    assert.equal(typeof stats.entryCount, 'number');
    assert.equal(typeof stats.maxEntries, 'number');
    assert.equal(typeof stats.memoryUsageBytes, 'number');
  });

  it('should clear all entries', async () => {
    await adapter.logQuery(mockQuery, mockResponse);
    assert.equal(adapter.getEntryCount(), 1);

    adapter.clearAll();
    assert.equal(adapter.getEntryCount(), 0);
  });

  it('should get entries by event type', async () => {
    await adapter.logQuery(mockQuery, mockResponse);
    
    const error = new VQPError('INVALID_QUERY', 'Test error');
    await adapter.logError(error, {});

    const queryEntries = adapter.getEntriesByEvent('query_processed');
    const errorEntries = adapter.getEntriesByEvent('error_occurred');
    
    assert.equal(queryEntries.length, 1);
    assert.equal(errorEntries.length, 1);
    assert.equal(queryEntries[0].event, 'query_processed');
    assert.equal(errorEntries[0].event, 'error_occurred');
  });

  it('should search entries by term', async () => {
    await adapter.logQuery(mockQuery, mockResponse);
    
    const error = new VQPError('INVALID_QUERY', 'Test error');
    await adapter.logError(error, {});

    // Search by queryId
    const queryResults = adapter.searchEntries(mockQuery.id);
    assert.equal(queryResults.length, 1);
    
    // Search by vocabulary
    const vocabResults = adapter.searchEntries('identity');
    assert.equal(vocabResults.length, 1);
    
    // Search by error code
    const errorResults = adapter.searchEntries('INVALID_QUERY');
    assert.equal(errorResults.length, 1);
  });
});
