/**
 * Example: Using FileAuditAdapter for audit logging
 * 
 * This example demonstrates how to configure and use the FileAuditAdapter
 * to log VQP queries and responses to files with automatic rotation.
 */

import { 
  VQPSystem, 
  VQPSystemConfig 
} from '../lib/index.js';
import { FileAuditAdapter } from '../lib/adapters/audit/file-adapter.js';
import { VQPQuery } from '../lib/domain/types.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';

async function fileAuditExample() {
  console.log('🔍 VQP File Audit Example');
  console.log('==========================\n');

  // Create a temporary directory for audit logs
  const auditLogDir = join(tmpdir(), 'vqp-audit-example');
  
  // Create VQP system configuration with file audit adapter
  const systemConfig: VQPSystemConfig = {
    data: {
      type: 'filesystem',
      vaultPath: './vault.json'
    },
    crypto: {
      type: 'software'
    },
    vocabulary: {
      type: 'http'
    },
    audit: {
      type: 'file',
      logDirectory: auditLogDir,
      maxFileSize: 1024 * 1024, // 1MB per file
      maxFiles: 5,               // Keep 5 rotated files
      includeFullQuery: true,    // Log complete query for debugging
      includeFullResponse: false, // Don't log full response for privacy
      logLevel: 'info',
      fileNamePattern: 'vqp-audit-{date}.log'
    },
    transport: {
      type: 'http',
      port: 3000
    }
  };

  // Create and configure VQP system
  console.log('📋 Configuration:');
  console.log(`   📁 Audit log directory: ${auditLogDir}`);
  console.log(`   🔄 Log rotation: ${systemConfig.audit.maxFileSize} bytes per file, ${systemConfig.audit.maxFiles} files max`);
  console.log(`   📝 Include full queries: ${systemConfig.audit.includeFullQuery}`);
  console.log(`   🔒 Include full responses: ${systemConfig.audit.includeFullResponse}\n`);

  const system = new VQPSystem(systemConfig);

  // Create a sample query
  const sampleQuery: VQPQuery = {
    id: randomUUID(),
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requester: 'did:web:audit-example.com',
    query: {
      lang: 'jsonlogic@1.0.0',
      vocab: 'vqp:identity:v1',
      expr: { '>=': [{ 'var': 'age' }, 18] }
    }
  };

  try {
    // Process the query
    console.log('🔍 Processing sample query...');
    const service = system.getService();
    const response = await service.processQuery(sampleQuery);
    console.log(`✅ Query processed: result = ${response.result}`);

    // Get direct access to the audit adapter to check logs
    const auditAdapter = (system as any).auditAdapter as FileAuditAdapter;

    // Show audit trail
    console.log('\n📜 Audit Trail:');
    const auditEntries = await auditAdapter.getAuditTrail();
    for (const entry of auditEntries) {
      console.log(`   ${entry.timestamp}: ${entry.event} (Query: ${entry.queryId})`);
    }

    // Process a few more queries to demonstrate logging
    console.log('\n🔄 Processing additional queries...');
    for (let i = 2; i <= 4; i++) {
      const query: VQPQuery = {
        ...sampleQuery,
        id: randomUUID(),
        timestamp: new Date().toISOString()
      };

      try {
        await service.processQuery(query);
        console.log(`   ✅ Query ${i} processed successfully`);
      } catch (error) {
        console.log(`   ❌ Query ${i} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Demonstrate error logging
    console.log('\n❌ Testing error logging...');
    try {
      const invalidQuery = {
        ...sampleQuery,
        id: randomUUID(),
        version: '2.0.0' // Invalid version
      } as VQPQuery;

      await service.processQuery(invalidQuery);
    } catch (error) {
      console.log(`   Expected error caught: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Show final audit trail
    console.log('\n📜 Final Audit Trail:');
    const finalEntries = await auditAdapter.getAuditTrail();
    console.log(`   Total entries: ${finalEntries.length}`);
    for (const entry of finalEntries) {
      console.log(`   ${entry.timestamp}: ${entry.event} (Query: ${entry.queryId || 'N/A'})`);
    }

    // List audit log files
    console.log('\n📁 Audit Log Files:');
    try {
      const files = await fs.readdir(auditLogDir);
      const logFiles = files.filter(f => f.includes('vqp-audit'));
      
      for (const file of logFiles) {
        const filePath = join(auditLogDir, file);
        const stats = await fs.stat(filePath);
        console.log(`   - ${file} (${stats.size} bytes)`);
      }
    } catch (error) {
      console.log('   No log files found or directory does not exist');
    }

  } catch (error) {
    console.error('❌ Error in file audit example:', error);
  } finally {
    // Cleanup: remove temporary audit directory
    try {
      await fs.rm(auditLogDir, { recursive: true, force: true });
      console.log('\n🧹 Cleaned up temporary audit directory');
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Export for use in other modules
export { fileAuditExample };

// Run the example
if (require.main === module) {
  fileAuditExample().catch(console.error);
}
