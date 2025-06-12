import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Crypto Adapter - Basic Tests', () => {
  describe('Node.js crypto operations', () => {
    it('should create hash from message', async () => {
      const crypto = await import('crypto');
      const message = 'test message for hashing';
      const hash = crypto.createHash('sha256').update(message).digest('hex');
      
      assert.ok(hash, 'Should generate hash');
      assert.strictEqual(hash.length, 64, 'SHA256 hash should be 64 characters');
      assert.strictEqual(typeof hash, 'string', 'Hash should be string');
    });

    it('should generate random bytes', async () => {
      const crypto = await import('crypto');
      const randomBytes = crypto.randomBytes(32);
      
      assert.ok(randomBytes, 'Should generate random bytes');
      assert.strictEqual(randomBytes.length, 32, 'Should generate 32 bytes');
      assert.ok(Buffer.isBuffer(randomBytes), 'Should return Buffer');
    });

    it('should create different hashes for different messages', async () => {
      const crypto = await import('crypto');
      const message1 = 'first message';
      const message2 = 'second message';
      
      const hash1 = crypto.createHash('sha256').update(message1).digest('hex');
      const hash2 = crypto.createHash('sha256').update(message2).digest('hex');
      
      assert.notStrictEqual(hash1, hash2, 'Different messages should produce different hashes');
    });

    it('should create consistent hashes for same message', async () => {
      const crypto = await import('crypto');
      const message = 'consistent message';
      
      const hash1 = crypto.createHash('sha256').update(message).digest('hex');
      const hash2 = crypto.createHash('sha256').update(message).digest('hex');
      
      assert.strictEqual(hash1, hash2, 'Same message should produce same hash');
    });
  });

  describe('Buffer operations', () => {
    it('should convert string to buffer and back', () => {
      const originalString = 'test string for buffer conversion';
      const buffer = Buffer.from(originalString, 'utf8');
      const convertedString = buffer.toString('utf8');
      
      assert.strictEqual(convertedString, originalString, 'String should be preserved through buffer conversion');
    });

    it('should handle empty strings', () => {
      const emptyString = '';
      const buffer = Buffer.from(emptyString);
      const convertedString = buffer.toString();
      
      assert.strictEqual(convertedString, emptyString, 'Empty string should be handled correctly');
      assert.strictEqual(buffer.length, 0, 'Empty buffer should have length 0');
    });

    it('should handle large strings', () => {
      const largeString = 'x'.repeat(10000);
      const buffer = Buffer.from(largeString);
      const convertedString = buffer.toString();
      
      assert.strictEqual(convertedString, largeString, 'Large string should be preserved');
      assert.strictEqual(buffer.length, 10000, 'Buffer length should match string length');
    });
  });
});
