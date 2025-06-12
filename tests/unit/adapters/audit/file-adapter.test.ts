/**
 * Tests for FileAuditAdapter
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { FileAuditAdapter } from '../../../../lib/adapters/audit/file-adapter.js';
import { VQPQuery, VQPResponse, VQPError, VQPErrorType } from '../../../../lib/domain/types.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileAuditAdapter', () => {
  let adapter: FileAuditAdapter;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test logs
    testDir = join(tmpdir(), 'vqp-test-audit-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    adapter = new FileAuditAdapter({
      logDirectory: testDir,
      maxFileSize: 1024, // Small size for testing rotation
      maxFiles: 3,
      includeFullQuery: true,
      includeFullResponse: true,
      logLevel: 'debug'
    });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('logQuery', () => {
    it('should log query and response to file', async () => {
      const query: VQPQuery = {
        id: 'test-query-1',
        version: '1.0.0',
        timestamp: '2025-06-12T10:00:00Z',
        requester: 'did:test:querier',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 18] }
        }
      };

      const response: VQPResponse = {
        queryId: 'test-query-1',
        version: '1.0.0',
        timestamp: '2025-06-12T10:00:01Z',
        responder: 'did:test:responder',
        result: true,
        proof: {
          type: 'signature',
          algorithm: 'ed25519',
          publicKey: 'test-public-key',
          signature: 'test-signature'
        }
      };

      await adapter.logQuery(query, response);

      // Check that log file was created
      const files = await fs.readdir(testDir);
      assert(files.length > 0, 'Log files should be created');

      const logFile = files.find(f => f.includes('vqp-audit'));
      assert(logFile, 'VQP audit log file should exist');

      // Read log content
      const content = await fs.readFile(join(testDir, logFile!), 'utf-8');
      const logEntry = JSON.parse(content.trim());

      assert.strictEqual(logEntry.event, 'query_processed');
      assert.strictEqual(logEntry.queryId, 'test-query-1');
      assert.strictEqual(logEntry.querier, 'did:test:querier');
      assert.strictEqual(logEntry.result, true);
      assert.strictEqual(logEntry.metadata.vocabulary, 'vqp:identity:v1');
      assert(logEntry.metadata.responseTime >= 0, 'Response time should be non-negative');
    });

    it('should include full query and response when configured', async () => {
      const query: VQPQuery = {
        id: 'test-query-2',
        version: '1.0.0',
        timestamp: '2025-06-12T10:00:00Z',
        requester: 'did:test:querier',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 21] }
        }
      };

      const response: VQPResponse = {
        queryId: 'test-query-2',
        version: '1.0.0',
        timestamp: '2025-06-12T10:00:01Z',
        responder: 'did:test:responder',
        result: false,
        proof: {
          type: 'signature',
          algorithm: 'ed25519',
          publicKey: 'test-public-key',
          signature: 'test-signature'
        }
      };

      await adapter.logQuery(query, response);

      const files = await fs.readdir(testDir);
      const logFile = files.find(f => f.includes('vqp-audit'));
      const content = await fs.readFile(join(testDir, logFile!), 'utf-8');
      const logEntry = JSON.parse(content.trim());

      assert.deepStrictEqual(logEntry.metadata.fullQuery, query);
      assert.deepStrictEqual(logEntry.metadata.fullResponse, response);
    });
  });

  describe('logError', () => {
    it('should log errors with context', async () => {
      const error = new VQPError(VQPErrorType.INVALID_QUERY, 'Test error message', {
        field: 'test-field',
        value: 'test-value'
      });

      const context = {
        queryId: 'test-query-error',
        operation: 'query-validation'
      };

      await adapter.logError(error, context);

      const files = await fs.readdir(testDir);
      const logFile = files.find(f => f.includes('vqp-audit'));
      const content = await fs.readFile(join(testDir, logFile!), 'utf-8');
      const logEntry = JSON.parse(content.trim());

      assert.strictEqual(logEntry.event, 'error_occurred');
      assert.strictEqual(logEntry.error.code, 'INVALID_QUERY');
      assert.strictEqual(logEntry.error.message, 'Test error message');
      assert.strictEqual(logEntry.metadata.errorCode, 'INVALID_QUERY');
      assert.strictEqual(logEntry.metadata.context.queryId, 'test-query-error');
    });

    it('should sanitize sensitive information from context', async () => {
      const error = new VQPError(VQPErrorType.CRYPTO_ERROR, 'Crypto operation failed');
      
      const context = {
        operation: 'signing',
        password: 'secret123',
        token: 'jwt-token-here',
        publicData: 'this-should-remain'
      };

      await adapter.logError(error, context);

      const files = await fs.readdir(testDir);
      const logFile = files.find(f => f.includes('vqp-audit'));
      const content = await fs.readFile(join(testDir, logFile!), 'utf-8');
      const logEntry = JSON.parse(content.trim());

      assert.strictEqual(logEntry.metadata.context.password, '[REDACTED]');
      assert.strictEqual(logEntry.metadata.context.token, '[REDACTED]');
      assert.strictEqual(logEntry.metadata.context.publicData, 'this-should-remain');
    });
  });

  describe('getAuditTrail', () => {
    beforeEach(async () => {
      // Create some test log entries
      const queries = [
        {
          id: 'query-1',
          timestamp: '2025-06-12T09:00:00Z',
          requester: 'did:test:user1'
        },
        {
          id: 'query-2', 
          timestamp: '2025-06-12T10:00:00Z',
          requester: 'did:test:user2'
        },
        {
          id: 'query-3',
          timestamp: '2025-06-12T11:00:00Z', 
          requester: 'did:test:user1'
        }
      ];

      for (const q of queries) {
        const query: VQPQuery = {
          ...q,
          version: '1.0.0',
          query: {
            lang: 'jsonlogic@1.0.0',
            vocab: 'vqp:identity:v1',
            expr: { '>=': [{ 'var': 'age' }, 18] }
          }
        };

        const response: VQPResponse = {
          queryId: q.id,
          version: '1.0.0',
          timestamp: new Date(new Date(q.timestamp).getTime() + 1000).toISOString(),
          responder: 'did:test:responder',
          result: true,
          proof: {
            type: 'signature',
            algorithm: 'ed25519',
            publicKey: 'test-key',
            signature: 'test-sig'
          }
        };

        await adapter.logQuery(query, response);
      }
    });

    it('should return all entries when no filters applied', async () => {
      const entries = await adapter.getAuditTrail();
      assert.strictEqual(entries.length, 3);
      
      // Should be sorted by timestamp (newest first)
      assert.strictEqual(entries[0].queryId, 'query-3');
      assert.strictEqual(entries[1].queryId, 'query-2');
      assert.strictEqual(entries[2].queryId, 'query-1');
    });

    it('should filter by querier', async () => {
      const entries = await adapter.getAuditTrail({
        querier: 'did:test:user1'
      });
      
      assert.strictEqual(entries.length, 2);
      assert(entries.every(e => e.querier === 'did:test:user1'), 'All entries should be from user1');
    });

    it('should filter by time range', async () => {
      const entries = await adapter.getAuditTrail({
        startTime: '2025-06-12T09:30:00Z',
        endTime: '2025-06-12T10:30:00Z'
      });
      
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].queryId, 'query-2');
    });

    it('should filter by event type', async () => {
      // Add an error entry
      const error = new VQPError(VQPErrorType.NETWORK_ERROR, 'Network failed');
      await adapter.logError(error, { test: true });

      const queryEntries = await adapter.getAuditTrail({
        event: 'query_processed'
      });
      
      const errorEntries = await adapter.getAuditTrail({
        event: 'error_occurred'
      });

      assert.strictEqual(queryEntries.length, 3);
      assert.strictEqual(errorEntries.length, 1);
      assert.strictEqual(errorEntries[0].event, 'error_occurred');
    });
  });

  describe('purgeOldEntries', () => {
    it('should remove entries older than specified date', async () => {
      // Create entries with different timestamps
      const oldQuery: VQPQuery = {
        id: 'old-query',
        version: '1.0.0',
        timestamp: '2025-06-10T10:00:00Z', // 2 days ago
        requester: 'did:test:user',
        query: {
          lang: 'jsonlogic@1.0.0',
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 18] }
        }
      };

      const newQuery: VQPQuery = {
        ...oldQuery,
        id: 'new-query',
        timestamp: '2025-06-12T10:00:00Z' // today
      };

      const response: VQPResponse = {
        queryId: oldQuery.id,
        version: '1.0.0',
        timestamp: '2025-06-10T10:00:01Z',
        responder: 'did:test:responder',
        result: true,
        proof: {
          type: 'signature',
          algorithm: 'ed25519',
          publicKey: 'test-key',
          signature: 'test-sig'
        }
      };

      await adapter.logQuery(oldQuery, response);
      await adapter.logQuery(newQuery, { ...response, queryId: newQuery.id, timestamp: '2025-06-12T10:00:01Z' });

      // Purge entries older than yesterday
      const purgedCount = await adapter.purgeOldEntries('2025-06-11T00:00:00Z');
      
      assert.strictEqual(purgedCount, 1);

      // Verify only new entry remains
      const remainingEntries = await adapter.getAuditTrail();
      assert.strictEqual(remainingEntries.length, 1);
      assert.strictEqual(remainingEntries[0].queryId, 'new-query');
    });
  });

  describe('file rotation', () => {
    it('should rotate log files when size limit is reached', async () => {
      // Create adapter with very small file size to trigger rotation
      const smallAdapter = new FileAuditAdapter({
        logDirectory: testDir,
        maxFileSize: 100, // Very small to trigger rotation quickly
        maxFiles: 2
      });

      // Generate enough log entries to trigger rotation
      for (let i = 0; i < 10; i++) {
        const query: VQPQuery = {
          id: `query-${i}`,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          requester: 'did:test:user',
          query: {
            lang: 'jsonlogic@1.0.0',
            vocab: 'vqp:identity:v1',
            expr: { '>=': [{ 'var': 'age' }, 18] }
          }
        };

        const response: VQPResponse = {
          queryId: query.id,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          responder: 'did:test:responder',
          result: true,
          proof: {
            type: 'signature',
            algorithm: 'ed25519',
            publicKey: 'test-key',
            signature: 'test-signature'
          }
        };

        await smallAdapter.logQuery(query, response);
      }

      // Check that rotated files exist
      const files = await fs.readdir(testDir);
      const logFiles = files.filter(f => f.includes('vqp-audit') && f.endsWith('.log'));
      
      // Should have current file and at least one rotated file
      assert(logFiles.length > 1, 'Should have multiple log files after rotation');
    });
  });
});
