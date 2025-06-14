/**
 * VQP Protocol - Main entry point
 * Export all public APIs following hexagonal architecture
 */

// Core domain exports
export { VQPService } from './domain/vqp-service.js';
export { VQPVerifier } from './domain/vqp-verifier.js';
export { QueryBuilder } from './domain/query-builder.js';
export * from './domain/types.js';
export * from './domain/ports/primary.js';
export * from './domain/ports/secondary.js';

// System assembly
export { VQPSystem, createVQPSystem } from './vqp-system.js';
export type { VQPSystemConfig } from './vqp-system.js';

// Adapters - Data
export { FileSystemDataAdapter } from './adapters/data/filesystem-adapter.js';
export type { FileSystemDataConfig } from './adapters/data/filesystem-adapter.js';

// Adapters - Crypto
export { SoftwareCryptoAdapter } from './adapters/crypto/software-adapter.js';
export type { SoftwareCryptoConfig } from './adapters/crypto/software-adapter.js';

// Adapters - Vocabulary
export { HTTPVocabularyAdapter } from './adapters/vocabulary/http-adapter.js';
export type { HTTPVocabularyConfig } from './adapters/vocabulary/http-adapter.js';

// Adapters - Audit
export { ConsoleAuditAdapter } from './adapters/audit/console-adapter.js';
export type { ConsoleAuditConfig } from './adapters/audit/console-adapter.js';
export { FileAuditAdapter } from './adapters/audit/file-adapter.js';
export type { FileAuditConfig } from './adapters/audit/file-adapter.js';
export { MemoryAuditAdapter } from './adapters/audit/memory-adapter.js';
export type { MemoryAuditConfig } from './adapters/audit/memory-adapter.js';
