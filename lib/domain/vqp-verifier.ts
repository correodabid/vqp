import { VQPResponse, Signature } from './types';
import { CryptographicPort } from './ports/secondary';

/**
 * VQP Verifier - Validates cryptographic proofs in VQP responses
 * 
 * This is a separate component from VQPService because verification
 * is often done by different parties than those generating responses.
 */
export class VQPVerifier {
  constructor(
    private crypto: CryptographicPort
  ) {}

  /**
   * Verify a VQP response's cryptographic proof
   */
  async verify(response: VQPResponse): Promise<boolean> {
    try {
      switch (response.proof.type) {
        case 'signature':
          return await this.verifySignature(response);
        
        case 'zk-snark':
          return await this.verifyZKProof(response);
        
        case 'multisig':
          return await this.verifyMultiSignature(response);
        
        default:
          throw new Error(`Unsupported proof type: ${(response.proof as any).type}`);
      }
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  /**
   * Verify digital signature proof
   */
  private async verifySignature(response: VQPResponse): Promise<boolean> {
    if (response.proof.type !== 'signature') {
      return false;
    }

    const { publicKey, signature } = response.proof;
    
    if (!publicKey || !signature) {
      throw new Error('Missing publicKey or signature in proof');
    }

    // Create the payload that should have been signed
    const signaturePayload = this.createSignaturePayload(response);
    const payloadBuffer = Buffer.from(JSON.stringify(signaturePayload));

    // Create a signature proof object for verification
    const signatureProof: Signature = {
      type: 'signature',
      algorithm: response.proof.algorithm || 'ed25519',
      publicKey,
      signature
    };

    return await this.crypto.verify(
      signatureProof,
      payloadBuffer,
      publicKey
    );
  }

  /**
   * Verify zero-knowledge proof
   */
  private async verifyZKProof(response: VQPResponse): Promise<boolean> {
    if (response.proof.type !== 'zk-snark') {
      return false;
    }

    // TODO: Implement ZK proof verification
    // This would use the circuit and public inputs to verify the proof
    throw new Error('ZK proof verification not yet implemented');
  }

  /**
   * Verify multi-signature proof
   */
  private async verifyMultiSignature(response: VQPResponse): Promise<boolean> {
    if (response.proof.type !== 'multisig') {
      return false;
    }

    // TODO: Implement multi-signature verification
    throw new Error('Multi-signature verification not yet implemented');
  }

  /**
   * Create the canonical payload that should be signed
   */
  private createSignaturePayload(response: VQPResponse) {
    return {
      queryId: response.queryId,
      result: response.result,
      timestamp: response.timestamp,
      responder: response.responder
    };
  }

  /**
   * Verify response metadata (timestamps, IDs, etc.)
   */
  async verifyMetadata(response: VQPResponse, originalQueryId?: string): Promise<boolean> {
    // Check timestamp is reasonable (not too old, not in future)
    const responseTime = new Date(response.timestamp);
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const maxSkew = 5 * 60 * 1000; // 5 minutes

    if (responseTime.getTime() > now.getTime() + maxSkew) {
      return false; // Response from future
    }

    if (now.getTime() - responseTime.getTime() > maxAge) {
      return false; // Response too old
    }

    // Verify query ID matches if provided
    if (originalQueryId && response.queryId !== originalQueryId) {
      return false;
    }

    // Verify required fields are present
    if (!response.queryId || !response.version || !response.responder) {
      return false;
    }

    return true;
  }

  /**
   * Full verification: both cryptographic proof and metadata
   */
  async verifyComplete(response: VQPResponse, originalQueryId?: string): Promise<{
    cryptographicProof: boolean;
    metadata: boolean;
    overall: boolean;
  }> {
    const cryptographicProof = await this.verify(response);
    const metadata = await this.verifyMetadata(response, originalQueryId);
    
    return {
      cryptographicProof,
      metadata,
      overall: cryptographicProof && metadata
    };
  }
}
