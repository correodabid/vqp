export { MemoryAuditAdapter } from './memory-adapter.js';
export type { MemoryAuditConfig } from './memory-adapter.js';

/**
 * Factory function to create a memory audit adapter
 */
export async function createMemoryAuditAdapter(
  config: import('./memory-adapter.js').MemoryAuditConfig = {}
) {
  const { MemoryAuditAdapter } = await import('./memory-adapter.js');
  return new MemoryAuditAdapter(config);
}
