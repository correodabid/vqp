// VQP Core Package - Adapter-agnostic VQP protocol implementation
export * from './domain/types.js';
export * from './domain/ports/primary.js';
export * from './domain/ports/secondary.js';
export * from './domain/vqp-service.js';
export * from './domain/vqp-verifier.js';
export * from './domain/query-builder.js';
export * from './domain/query-utils.js';

// Export vocabulary mapping interfaces and implementations
export type { VocabularyMapping } from './domain/vqp-service.js';
export { StandardVocabularyMapping, FlatVocabularyMapping } from './domain/vqp-service.js';
