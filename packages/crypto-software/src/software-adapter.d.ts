/**
 * Software Crypto Adapter - Implements CryptographicPort using software crypto
 * This adapter uses @noble/ed25519 for digital signatures
 */
import { CryptographicPort, Proof } from '@vqp/core';
export interface SoftwareCryptoConfig {
  defaultKeyId?: string;
  keyPairs?: Record<
    string,
    {
      publicKey: string;
      privateKey: string;
    }
  >;
}
export declare class SoftwareCryptoAdapter implements CryptographicPort {
  private _config;
  private keyPairs;
  constructor(_config?: SoftwareCryptoConfig);
  sign(data: Buffer, keyId?: string): Promise<Proof>;
  verify(signature: Proof, data: Buffer, publicKey: string): Promise<boolean>;
  generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }>;
  deriveKey(input: string, salt?: string): Promise<string>;
  /**
   * Add a key pair to the adapter
   */
  addKeyPair(keyId: string, publicKey?: string, privateKey?: string): Promise<void>;
  /**
   * Get public key for a key ID
   */
  getPublicKey(keyId: string): string | null;
  /**
   * List all available key IDs
   */
  getKeyIds(): string[];
  /**
   * Remove a key pair
   */
  removeKeyPair(keyId: string): boolean;
  /**
   * Initialize keys from configuration (synchronous for configured keys only)
   */
  private initializeKeys;
  /**
   * Convert bytes to hex string
   */
  private bytesToHex;
  /**
   * Convert hex string to bytes
   */
  private hexToBytes;
}
//# sourceMappingURL=software-adapter.d.ts.map
