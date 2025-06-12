/**
 * Software Crypto Adapter - Implements CryptographicPort using software crypto
 * This adapter uses @noble/ed25519 for digital signatures
 */

import * as ed25519 from '@noble/ed25519';
import { createHash } from 'crypto';
import { pbkdf2Sync } from 'crypto';
import { CryptographicPort } from '../../domain/ports/secondary.js';
import { Proof } from '../../domain/types.js';

// Set up SHA-512 for Noble Ed25519
ed25519.etc.sha512Sync = (...m) => createHash('sha512').update(Buffer.concat(m)).digest();

export interface SoftwareCryptoConfig {
  defaultKeyId?: string;
  keyPairs?: Record<string, {
    publicKey: string;
    privateKey: string;
  }>;
}

export class SoftwareCryptoAdapter implements CryptographicPort {
  private keyPairs: Map<string, { publicKey: Uint8Array; privateKey: Uint8Array }> = new Map();

  constructor(private config: SoftwareCryptoConfig = {}) {
    this.initializeKeys();
  }

  async sign(data: Buffer, keyId: string = 'default'): Promise<Proof> {
    const keyPair = this.keyPairs.get(keyId);
    if (!keyPair) {
      throw new Error(`Key not found: ${keyId}`);
    }

    try {
      const signature = await ed25519.sign(data, keyPair.privateKey);

      return {
        type: 'signature' as const,
        algorithm: 'ed25519' as const,
        publicKey: this.bytesToHex(keyPair.publicKey),
        signature: this.bytesToHex(signature)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Signature generation failed: ${errorMessage}`);
    }
  }

  async verify(signature: Proof, data: Buffer, publicKey: string): Promise<boolean> {
    if (signature.type !== 'signature' || signature.algorithm !== 'ed25519') {
      throw new Error('Unsupported signature type');
    }

    try {
      const pubKeyBytes = this.hexToBytes(publicKey);
      const sigBytes = this.hexToBytes(signature.signature);

      return await ed25519.verify(sigBytes, data, pubKeyBytes);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKey(privateKey);

    return {
      publicKey: this.bytesToHex(publicKey),
      privateKey: this.bytesToHex(privateKey)
    };
  }

  async deriveKey(input: string, salt?: string): Promise<string> {
    try {
      // Use provided salt or generate deterministic salt from input
      const saltBuffer = salt
        ? Buffer.from(salt, 'utf8')
        : createHash('sha256').update(input).digest().slice(0, 16);

      // Use PBKDF2 with SHA-256, 100,000 iterations (NIST recommended minimum)
      const derivedKey = pbkdf2Sync(
        input,           // password/input
        saltBuffer,      // salt
        100000,          // iterations (NIST recommended minimum)
        32,              // key length (256 bits)
        'sha256'         // hash function
      );

      return this.bytesToHex(derivedKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Key derivation failed: ${errorMessage}`);
    }
  }

  /**
   * Add a key pair to the adapter
   */
  async addKeyPair(keyId: string, publicKey?: string, privateKey?: string): Promise<void> {
    let pubKey: Uint8Array;
    let privKey: Uint8Array;

    if (publicKey && privateKey) {
      pubKey = this.hexToBytes(publicKey);
      privKey = this.hexToBytes(privateKey);
    } else {
      // Generate new key pair
      privKey = ed25519.utils.randomPrivateKey();
      pubKey = await ed25519.getPublicKey(privKey);
    }

    this.keyPairs.set(keyId, {
      publicKey: pubKey,
      privateKey: privKey
    });
  }

  /**
   * Get public key for a key ID
   */
  getPublicKey(keyId: string): string | null {
    const keyPair = this.keyPairs.get(keyId);
    return keyPair ? this.bytesToHex(keyPair.publicKey) : null;
  }

  /**
   * List all available key IDs
   */
  getKeyIds(): string[] {
    return Array.from(this.keyPairs.keys());
  }

  /**
   * Remove a key pair
   */
  removeKeyPair(keyId: string): boolean {
    return this.keyPairs.delete(keyId);
  }

  /**
   * Initialize keys from configuration
   */
  private async initializeKeys(): Promise<void> {
    if (this.config.keyPairs) {
      for (const [keyId, keyData] of Object.entries(this.config.keyPairs)) {
        await this.addKeyPair(keyId, keyData.publicKey, keyData.privateKey);
      }
    }

    // Ensure default key exists
    if (!this.keyPairs.has('default')) {
      await this.addKeyPair('default');
    }
  }

  /**
   * Convert bytes to hex string
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to bytes
   */
  private hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string length');
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}
