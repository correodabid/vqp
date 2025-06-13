/**
 * Secondary Ports (Driven Side)
 * These define how VQP interacts with external systems
 */

import { VQPQuery, VQPResponse, Proof, AuditEntry, VQPError } from '../types.js';

/**
 * Data Access Port - How VQP accesses and validates data
 */
export interface DataAccessPort {
  getData(path: string[]): Promise<any>;
  validateDataAccess(path: string[], requester: string): Promise<boolean>;
  hasData(path: string[]): Promise<boolean>;
}

/**
 * Cryptographic Port - How VQP handles cryptographic operations
 */
export interface CryptographicPort {
  sign(data: Buffer, keyId: string): Promise<Proof>;
  verify(signature: Proof, data: Buffer, publicKey: string): Promise<boolean>;
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  deriveKey(input: string, salt?: string): Promise<string>;
  
  // ZK Proof support (optional - for advanced crypto adapters)
  generateZKProof?(circuit: string, inputs: any, publicInputs?: any): Promise<Proof>;
  verifyZKProof?(proof: Proof, publicInputs: any, circuit?: string): Promise<boolean>;
  
  // Circuit management (for snarkjs integration)
  loadCircuit?(circuitPath: string): Promise<void>;
  hasCircuit?(circuitId: string): Promise<boolean>;
  listCircuits?(): Promise<string[]>;
}

/**
 * Vocabulary Port - How VQP resolves and validates vocabularies
 */
export interface VocabularyPort {
  resolveVocabulary(uri: string): Promise<any>; // JSON Schema
  validateAgainstVocabulary(data: any, vocabulary: any): Promise<boolean>;
  cacheVocabulary(uri: string, schema: any): Promise<void>;
  isVocabularyAllowed(uri: string): Promise<boolean>;
}

/**
 * Network Port - How VQP communicates with other nodes
 */
export interface NetworkPort {
  sendQuery(endpoint: string, query: VQPQuery): Promise<VQPResponse>;
  broadcastQuery(query: VQPQuery): Promise<VQPResponse[]>;
  discoverPeers(
    capability: string
  ): Promise<Array<{ endpoint: string; did: string; capabilities: string[] }>>;
  isReachable(endpoint: string): Promise<boolean>;
}

/**
 * Audit Port - How VQP logs and tracks activities
 */
export interface AuditPort {
  logQuery(query: VQPQuery, response: VQPResponse): Promise<void>;
  logError(error: VQPError, context: any): Promise<void>;
  getAuditTrail(filters?: {
    startTime?: string;
    endTime?: string;
    querier?: string;
    event?: string;
  }): Promise<AuditEntry[]>;
  purgeOldEntries(olderThan: string): Promise<number>;
}
