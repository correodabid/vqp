import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { VQPService } from '../../../lib/domain/vqp-service.js';
import { VQPQuery, VQPResponse } from '../../../lib/domain/types.js';
import { DataAccessPort, CryptographicPort, VocabularyPort, AuditPort } from '../../../lib/domain/ports/secondary.js';

// Mock adapters for testing
class MockDataAdapter implements DataAccessPort {
  constructor(private mockData: any) {}

  async getData(path: string[]): Promise<any> {
    let current = this.mockData;
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  async validateDataAccess(path: string[], requester: string): Promise<boolean> {
    // In tests, always allow access unless explicitly denied
    return true;
  }

  async hasData(path: string[]): Promise<boolean> {
    const data = await this.getData(path);
    return data !== undefined;
  }
}

class MockCryptoAdapter implements CryptographicPort {
  async sign(data: Buffer, keyId: string): Promise<any> {
    return {
      type: 'signature',
      algorithm: 'ed25519',
      signature: 'mock_signature_' + Buffer.from(data).toString('hex').slice(0, 16),
      publicKey: 'mock_public_key'
    };
  }

  async verify(signature: any, data: Buffer, publicKey: string): Promise<boolean> {
    // Simple mock verification - in real tests you'd want more sophisticated logic
    return signature.signature.startsWith('mock_signature_');
  }

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    return {
      publicKey: 'mock_public_key_' + Math.random().toString(36).substring(7),
      privateKey: 'mock_private_key_' + Math.random().toString(36).substring(7)
    };
  }

  async deriveKey(input: string, salt?: string): Promise<string> {
    // Simple mock key derivation
    const combined = input + (salt || 'default_salt');
    return 'derived_key_' + Buffer.from(combined).toString('base64').slice(0, 16);
  }

  async generateZKProof(circuit: string, inputs: any): Promise<any> {
    return {
      type: 'zk-snark',
      circuit: circuit,
      proof: 'mock_zk_proof',
      publicInputs: inputs
    };
  }

  async verifyZKProof(proof: any, publicInputs: any): Promise<boolean> {
    return proof.proof === 'mock_zk_proof';
  }
}

class MockVocabularyAdapter implements VocabularyPort {
  private vocabularies = new Map<string, any>();

  constructor() {
    // Add standard identity vocabulary
    this.vocabularies.set('vqp:identity:v1', {
      type: 'object',
      properties: {
        age: { type: 'integer', minimum: 0, maximum: 150 },
        citizenship: { type: 'string', pattern: '^[A-Z]{2}$' },
        has_drivers_license: { type: 'boolean' }
      }
    });
  }

  async resolveVocabulary(uri: string): Promise<any> {
    const vocab = this.vocabularies.get(uri);
    if (!vocab) {
      throw new Error(`Vocabulary not found: ${uri}`);
    }
    return vocab;
  }

  async validateAgainstVocabulary(data: any, vocabulary: any): Promise<boolean> {
    // Simplified validation for tests
    return true;
  }

  async cacheVocabulary(uri: string, schema: any): Promise<void> {
    this.vocabularies.set(uri, schema);
  }

  async isVocabularyAllowed(uri: string): Promise<boolean> {
    // In tests, allow standard vocabularies
    return uri.startsWith('vqp:') || this.vocabularies.has(uri);
  }
}

class MockAuditAdapter implements AuditPort {
  private logs: any[] = [];

  async logQuery(query: VQPQuery, response: VQPResponse): Promise<void> {
    this.logs.push({ query, response, timestamp: new Date() });
  }

  async logError(error: Error, context: any): Promise<void> {
    this.logs.push({ error: error.message, context, timestamp: new Date() });
  }

  async getAuditTrail(filters?: any): Promise<any[]> {
    return this.logs;
  }

  async purgeOldEntries(olderThan: string): Promise<number> {
    const cutoffDate = new Date(olderThan);
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffDate);
    return initialCount - this.logs.length;
  }

  getLogs() {
    return this.logs;
  }
}

describe('VQP Service - Basic Tests', () => {
  let vqpService: VQPService;
  let mockDataAdapter: MockDataAdapter;
  let mockCryptoAdapter: MockCryptoAdapter;
  let mockVocabularyAdapter: MockVocabularyAdapter;
  let mockAuditAdapter: MockAuditAdapter;

  beforeEach(() => {
    // Setup mock data
    const mockData = {
      personal: {
        age: 25,
        citizenship: 'US',
        has_drivers_license: true
      }
    };

    // Create mock adapters
    mockDataAdapter = new MockDataAdapter(mockData);
    mockCryptoAdapter = new MockCryptoAdapter();
    mockVocabularyAdapter = new MockVocabularyAdapter();
    mockAuditAdapter = new MockAuditAdapter();

    // Create VQP service with mocks
    vqpService = new VQPService(
      mockDataAdapter,
      mockCryptoAdapter,
      mockVocabularyAdapter,
      mockAuditAdapter,
      {
        maxQueryComplexity: 10,
        allowedVocabularies: ['vqp:identity:v1', 'vqp:financial:v1'],
        rateLimits: {
          queriesPerHour: 100,
          queriesPerDay: 1000
        }
      }
    );
  });

  it('should create VQP service successfully', () => {
    assert.ok(vqpService, 'VQP service should be created');
  });

  it('should handle basic data retrieval', async () => {
    const data = await mockDataAdapter.getData(['personal', 'age']);
    assert.strictEqual(data, 25, 'Should retrieve age correctly');
  });

  it('should handle crypto operations', async () => {
    const message = Buffer.from('test message');
    const signature = await mockCryptoAdapter.sign(message, 'test-key');
    
    assert.ok(signature, 'Should generate signature');
    assert.ok(signature.signature.startsWith('mock_signature_'), 'Should have mock signature format');
    
    const isValid = await mockCryptoAdapter.verify(signature, message, signature.publicKey);
    assert.strictEqual(isValid, true, 'Should verify signature');
  });

  it('should handle vocabulary operations', async () => {
    const vocab = await mockVocabularyAdapter.resolveVocabulary('vqp:identity:v1');
    assert.ok(vocab, 'Should resolve vocabulary');
    assert.ok(vocab.properties, 'Should have properties');
    assert.ok(vocab.properties.age, 'Should have age property');
  });

  it('should process a complete VQP query', async () => {
    const query: VQPQuery = {
      id: uuidv4(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:test.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ 'var': 'personal.age' }, 18] }
      }
    };

    const response = await vqpService.processQuery(query);
    
    assert.strictEqual(response.queryId, query.id, 'Should reference original query ID');
    assert.strictEqual(response.version, '1.0.0', 'Should have correct version');
    assert.strictEqual(typeof response.result, 'boolean', 'Should return boolean result');
    assert.ok(response.proof, 'Should include proof');
    assert.strictEqual(response.proof.type, 'signature', 'Should have signature proof');
  });

  it('should handle audit logging', async () => {
    const initialLogsCount = mockAuditAdapter.getLogs().length;
    
    const query: VQPQuery = {
      id: uuidv4(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requester: 'did:web:test.com',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ 'var': 'personal.age' }, 21] }
      }
    };

    await vqpService.processQuery(query);
    
    const finalLogsCount = mockAuditAdapter.getLogs().length;
    assert.strictEqual(finalLogsCount, initialLogsCount + 1, 'Should add audit log entry');
    
    const lastLog = mockAuditAdapter.getLogs()[finalLogsCount - 1];
    assert.strictEqual(lastLog.query.id, query.id, 'Should log the correct query');
  });

  it('should handle key generation and derivation', async () => {
    const keyPair = await mockCryptoAdapter.generateKeyPair();
    assert.ok(keyPair.publicKey, 'Should generate public key');
    assert.ok(keyPair.privateKey, 'Should generate private key');
    assert.ok(keyPair.publicKey.startsWith('mock_public_key_'), 'Should have mock format');
    
    const derivedKey = await mockCryptoAdapter.deriveKey('test_input', 'test_salt');
    assert.ok(derivedKey, 'Should derive key');
    assert.ok(derivedKey.startsWith('derived_key_'), 'Should have derived key format');
  });

  it('should handle audit entry purging', async () => {
    // Add some test logs
    await mockAuditAdapter.logError(new Error('Test error'), { test: true });
    
    const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const purgedCount = await mockAuditAdapter.purgeOldEntries(oldDate);
    
    assert.strictEqual(typeof purgedCount, 'number', 'Should return number of purged entries');
  });
});
