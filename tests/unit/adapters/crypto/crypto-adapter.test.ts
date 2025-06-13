import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createHash, randomBytes } from 'node:crypto';

describe('Node.js Crypto Module Tests', () => {
  test('should create hash from message', async () => {
    const message = 'test message for hashing';
    const hash = createHash('sha256').update(message).digest('hex');

    assert.ok(hash, 'Should generate hash');
    assert.strictEqual(hash.length, 64, 'SHA256 hash should be 64 characters');
    assert.strictEqual(typeof hash, 'string', 'Hash should be string');
  });

  test('should generate random bytes', async () => {
    const buffer = randomBytes(32);

    assert.ok(buffer, 'Should generate buffer');
    assert.strictEqual(buffer.length, 32, 'Buffer should be 32 bytes');
    assert.ok(Buffer.isBuffer(buffer), 'Should be a Buffer instance');
  });

  test('should create different hashes for different messages', async () => {
    const message1 = 'first message';
    const message2 = 'second message';

    const hash1 = createHash('sha256').update(message1).digest('hex');
    const hash2 = createHash('sha256').update(message2).digest('hex');

    assert.notStrictEqual(hash1, hash2, 'Different messages should produce different hashes');
  });

  test('should handle empty input', async () => {
    const emptyString = '';
    const hash = createHash('sha256').update(emptyString).digest('hex');

    assert.ok(hash, 'Should generate hash for empty string');
    assert.strictEqual(hash.length, 64, 'Empty string hash should still be 64 characters');
  });

  test('should generate different random bytes each time', async () => {
    const buffer1 = randomBytes(16);
    const buffer2 = randomBytes(16);

    assert.ok(buffer1, 'Should generate first buffer');
    assert.ok(buffer2, 'Should generate second buffer');
    assert.notStrictEqual(
      buffer1.toString('hex'),
      buffer2.toString('hex'),
      'Random bytes should be different'
    );
  });

  test('should support different hash algorithms', async () => {
    const message = 'test message';

    const sha256Hash = createHash('sha256').update(message).digest('hex');
    const sha512Hash = createHash('sha512').update(message).digest('hex');

    assert.strictEqual(sha256Hash.length, 64, 'SHA256 hash should be 64 characters');
    assert.strictEqual(sha512Hash.length, 128, 'SHA512 hash should be 128 characters');
    assert.notStrictEqual(
      sha256Hash,
      sha512Hash,
      'Different algorithms should produce different hashes'
    );
  });

  test('should support different output formats', async () => {
    const message = 'test message';
    const hash = createHash('sha256').update(message);

    const hexHash = hash.copy().digest('hex');
    const base64Hash = hash.copy().digest('base64');
    const bufferHash = hash.copy().digest();

    assert.ok(hexHash, 'Should generate hex hash');
    assert.ok(base64Hash, 'Should generate base64 hash');
    assert.ok(Buffer.isBuffer(bufferHash), 'Should generate buffer hash');

    assert.strictEqual(typeof hexHash, 'string', 'Hex hash should be string');
    assert.strictEqual(typeof base64Hash, 'string', 'Base64 hash should be string');
  });

  test('should handle large amounts of random data', async () => {
    const largeBuffer = randomBytes(1024); // 1KB

    assert.ok(largeBuffer, 'Should generate large buffer');
    assert.strictEqual(largeBuffer.length, 1024, 'Buffer should be 1024 bytes');

    // Test that it's not all zeros (extremely unlikely with crypto random)
    const allZeros = Buffer.alloc(1024, 0);
    assert.notStrictEqual(
      largeBuffer.toString('hex'),
      allZeros.toString('hex'),
      'Random buffer should not be all zeros'
    );
  });

  test('should handle incremental hashing', async () => {
    const message1 = 'Hello ';
    const message2 = 'World!';

    // Hash in parts
    const hash1 = createHash('sha256');
    hash1.update(message1);
    hash1.update(message2);
    const incrementalHash = hash1.digest('hex');

    // Hash all at once
    const completeHash = createHash('sha256')
      .update(message1 + message2)
      .digest('hex');

    assert.strictEqual(
      incrementalHash,
      completeHash,
      'Incremental and complete hashing should produce same result'
    );
  });

  test('should validate crypto module is available', async () => {
    // Test that crypto module functions are available
    assert.ok(typeof createHash === 'function', 'createHash should be available');
    assert.ok(typeof randomBytes === 'function', 'randomBytes should be available');

    // Test that they can be called
    const hash = createHash('sha256');
    const bytes = randomBytes(1);

    assert.ok(hash, 'Should create hash instance');
    assert.ok(bytes, 'Should create random bytes');
  });
});
