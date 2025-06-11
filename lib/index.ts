/**
 * VQP Protocol - Main entry point
 * Export all public APIs following hexagonal architecture
 */

// Core domain exports
export { VQPService } from './domain/vqp-service.js';
export * from './domain/types.js';
export * from './domain/ports/primary.js';
export * from './domain/ports/secondary.js';

// System assembly
export { VQPSystem, createVQPSystem } from './vqp-system.js';
export type { VQPSystemConfig } from './vqp-system.js';

// Adapters - Transport
export { HTTPTransportAdapter } from './adapters/transport/http-adapter.js';

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

// Vendor exports
export * from './vendor/jsonlogic.js';
