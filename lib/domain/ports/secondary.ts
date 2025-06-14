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
 * Query Evaluation Port - How VQP evaluates query expressions
 */
export interface QueryEvaluationPort {
  evaluate(expression: any, data: any): Promise<any>;
  isValidExpression(expression: any): Promise<boolean>;
  extractVariables(expression: any): Promise<string[]>;
  sanitizeExpression(expression: any): Promise<any>;
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
 * Transport Port - Optional interface for transport adapters
 * This is not part of the core VQP protocol but can be used by applications
 * that need network abstraction
 */
export interface TransportPort {
  sendMessage(destination: string, message: any): Promise<any>;
  receiveMessages(handler: (message: any) => Promise<any>): Promise<void>;
  isAvailable(): Promise<boolean>;
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
