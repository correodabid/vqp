/**
 * Core VQP types and interfaces
 */

// Core VQP Query structure
export interface VQPQuery {
  id: string;                    // UUID v4
  version: string;               // "1.0.0"
  timestamp: string;             // ISO 8601
  requester: string;             // DID of querier
  target?: string;               // DID of responder (optional for broadcast)
  query: {
    lang: "jsonlogic@1.0.0";    // Query language version
    vocab: string;               // Vocabulary URI
    expr: object;                // JSONLogic expression
  };
}

// Core VQP Response structure
export interface VQPResponse {
  queryId: string;               // Reference to original query
  version: string;               // VQP version
  timestamp: string;             // Response timestamp
  responder: string;             // DID of responder
  result: boolean | number | string | null; // Query result
  proof: Proof;
}

// Proof types
export interface Signature {
  type: "signature";
  algorithm: "ed25519" | "secp256k1" | "rsa-pss";
  publicKey: string;             // Base58 encoded public key
  signature: string;             // Hex encoded signature
}

export interface ZKProof {
  type: "zk-snark";
  circuit: string;               // Circuit identifier
  proof: string;                 // Base64 encoded proof
  publicInputs: Record<string, any>;
}

export interface MultiSignature {
  type: "multisig";
  threshold: number;
  signatures: Array<{
    signer: string;              // DID of signer
    algorithm: string;
    signature: string;
  }>;
}

export type Proof = Signature | ZKProof | MultiSignature;

// Error types
export type VQPErrorCode = 
  | "INVALID_QUERY" 
  | "EVALUATION_ERROR" 
  | "SIGNATURE_FAILED" 
  | "VOCABULARY_NOT_FOUND" 
  | "UNAUTHORIZED" 
  | "RATE_LIMITED" 
  | "NETWORK_ERROR" 
  | "CRYPTO_ERROR"
  | "CONFIGURATION_ERROR";

export class VQPError extends Error {
  public readonly code: VQPErrorCode;
  public readonly details?: Record<string, any>;

  constructor(code: VQPErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'VQPError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

// Configuration types
export interface VQPConfig {
  adapters: {
    transport: string;
    data: string;
    crypto: string;
    vocabulary: string;
    audit: string;
  };
  config: Record<string, any>;
}

// Audit types
export interface AuditEntry {
  timestamp: string;
  event: "query_received" | "query_processed" | "error_occurred" | "key_rotated";
  queryId?: string;
  querier?: string;
  result?: boolean;
  error?: VQPError;
  metadata?: Record<string, any>;
}

// System status
export interface SystemStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  queriesProcessed: number;
  lastError?: VQPError;
  version: string;
}
