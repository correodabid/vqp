/**
 * Example demonstrating the MemoryAuditAdapter usage
 */

import { MemoryAuditAdapter } from '../lib/adapters/audit/memory-adapter.js';
import { VQPError } from '../lib/domain/types.js';

async function demonstrateMemoryAuditAdapter() {
  console.log('🔍 MemoryAuditAdapter Demo\n');

  // Create adapter with configuration
  const adapter = new MemoryAuditAdapter({
    maxEntries: 1000,
    includeFullQuery: true,
    includeFullResponse: false,
    autoCleanup: true
  });

  // Mock query and response
  const mockQuery = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    version: '1.0.0',
    timestamp: '2025-06-12T10:00:00Z',
    requester: 'did:web:example.com',
    target: 'did:web:responder.com',
    query: {
      lang: 'jsonlogic@1.0.0' as const,
      vocab: 'vqp:identity:v1',
      expr: { '>=': [{ 'var': 'age' }, 18] }
    }
  };

  const mockResponse = {
    queryId: '123e4567-e89b-12d3-a456-426614174000',
    version: '1.0.0',
    timestamp: '2025-06-12T10:00:01Z',
    responder: 'did:web:responder.com',
    result: true as const,
    proof: {
      type: 'signature' as const,
      algorithm: 'ed25519' as const,
      publicKey: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
      signature: '0x304402207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0'
    }
  };

  console.log('📝 Logging query and response...');
  await adapter.logQuery(mockQuery, mockResponse);

  console.log('❌ Logging an error...');
  const error = new VQPError('INVALID_QUERY', 'Query validation failed', { field: 'age' });
  await adapter.logError(error, { operation: 'validate', queryId: mockQuery.id });

  console.log('📊 Memory Statistics:');
  const stats = adapter.getMemoryStats();
  console.log(`  - Total entries: ${stats.entryCount}`);
  console.log(`  - Max entries: ${stats.maxEntries}`);
  console.log(`  - Memory usage: ${stats.memoryUsageBytes} bytes`);
  console.log(`  - Newest entry: ${stats.newestEntry}`);
  console.log(`  - Oldest entry: ${stats.oldestEntry}`);

  console.log('\n🔍 Getting audit trail...');
  const allEntries = await adapter.getAuditTrail();
  console.log(`Found ${allEntries.length} entries:`);
  
  allEntries.forEach((entry, index) => {
    console.log(`  ${index + 1}. Event: ${entry.event}`);
    console.log(`     Timestamp: ${entry.timestamp}`);
    if (entry.queryId) console.log(`     Query ID: ${entry.queryId}`);
    if (entry.querier) console.log(`     Querier: ${entry.querier}`);
    if (entry.result !== undefined) console.log(`     Result: ${entry.result}`);
    if (entry.error) console.log(`     Error: ${entry.error.code} - ${entry.error.message}`);
    console.log();
  });

  console.log('🔍 Filtering by event type (errors only)...');
  const errorEntries = await adapter.getAuditTrail({ event: 'error_occurred' });
  console.log(`Found ${errorEntries.length} error entries`);

  console.log('🔍 Searching entries...');
  const searchResults = adapter.searchEntries('identity');
  console.log(`Found ${searchResults.length} entries containing "identity"`);

  console.log('🧹 Testing cleanup...');
  console.log(`Entries before cleanup: ${adapter.getEntryCount()}`);
  
  // Add more entries to test auto-cleanup
  const limitedAdapter = new MemoryAuditAdapter({ maxEntries: 2, autoCleanup: true });
  
  for (let i = 0; i < 5; i++) {
    const query = { ...mockQuery, id: `query-${i}` };
    const response = { 
      ...mockResponse, 
      queryId: `query-${i}`,
      proof: {
        ...mockResponse.proof,
        algorithm: 'ed25519' as const
      }
    };
    await limitedAdapter.logQuery(query, response);
  }
  
  console.log(`Limited adapter entries (max 2): ${limitedAdapter.getEntryCount()}`);

  console.log('\n✅ MemoryAuditAdapter demo completed successfully!');
}

// Run the demo
demonstrateMemoryAuditAdapter().catch(console.error);
