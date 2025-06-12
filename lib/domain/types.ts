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

// Error types - both enum and type for backward compatibility
export enum VQPErrorType {
  INVALID_QUERY = "INVALID_QUERY",
  EVALUATION_ERROR = "EVALUATION_ERROR", 
  SIGNATURE_FAILED = "SIGNATURE_FAILED",
  VOCABULARY_NOT_FOUND = "VOCABULARY_NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  RATE_LIMITED = "RATE_LIMITED",
  NETWORK_ERROR = "NETWORK_ERROR",
  CRYPTO_ERROR = "CRYPTO_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
}

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

// Validation result type
export interface ValidationResult {
  valid: boolean;
  errors?: string[] | undefined;
}

// Utility functions
export function isValidTimestamp(timestamp: string, maxAgeHours: number = 24): boolean {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - date.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return !isNaN(date.getTime()) && diffHours <= maxAgeHours;
  } catch {
    return false;
  }
}

export function createVQPError(
  code: VQPErrorType | VQPErrorCode, 
  message: string, 
  details?: Record<string, any>
): VQPError {
  return new VQPError(code as VQPErrorCode, message, details);
}

export function validateVQPQuery(query: any): ValidationResult {
  const errors: string[] = [];
  
  // Basic structure validation
  if (!query) {
    errors.push('Query is required');
    return { valid: false, errors };
  }
  
  if (!query.id || typeof query.id !== 'string') {
    errors.push('Query ID is required and must be a string');
  }
  
  if (!query.version || query.version !== '1.0.0') {
    errors.push('Version must be "1.0.0"');
  }
  
  if (!query.timestamp || !isValidTimestamp(query.timestamp)) {
    errors.push('Valid timestamp is required');
  }
  
  if (!query.requester || typeof query.requester !== 'string') {
    errors.push('Requester DID is required');
  }
  
  if (!query.query) {
    errors.push('Query object is required');
  } else {
    if (query.query.lang !== 'jsonlogic@1.0.0') {
      errors.push('Query language must be "jsonlogic@1.0.0"');
    }
    
    if (!query.query.vocab || typeof query.query.vocab !== 'string') {
      errors.push('Vocabulary is required');
    }
    
    if (!query.query.expr) {
      errors.push('Query expression is required');
    }
  }
  
  return { 
    valid: errors.length === 0, 
    ...(errors.length > 0 && { errors })
  };
}

export function validateVQPResponse(response: any): ValidationResult {
  const errors: string[] = [];
  
  if (!response) {
    errors.push('Response is required');
    return { valid: false, errors };
  }
  
  if (!response.queryId || typeof response.queryId !== 'string') {
    errors.push('Query ID reference is required');
  }
  
  if (!response.version || response.version !== '1.0.0') {
    errors.push('Version must be "1.0.0"');
  }
  
  if (!response.timestamp || !isValidTimestamp(response.timestamp)) {
    errors.push('Valid timestamp is required');
  }
  
  if (!response.responder || typeof response.responder !== 'string') {
    errors.push('Responder DID is required');
  }
  
  if (response.result === undefined || response.result === null) {
    errors.push('Result is required');
  }
  
  if (!response.proof) {
    errors.push('Proof is required');
  } else {
    if (!response.proof.type || !['signature', 'zk-snark', 'multisig'].includes(response.proof.type)) {
      errors.push('Proof type must be one of: signature, zk-snark, multisig');
    }
    
    if (response.proof.type === 'signature') {
      if (!response.proof.algorithm || !response.proof.publicKey || !response.proof.signature) {
        errors.push('Signature proof requires algorithm, publicKey, and signature');
      }
    }
  }
  
  return { 
    valid: errors.length === 0, 
    ...(errors.length > 0 && { errors })
  };
}
