export { FileAuditAdapter } from './file-adapter.js';
export type { FileAuditConfig } from './file-adapter.js';

/**
 * Factory function to create a file audit adapter
 */
export async function createFileAuditAdapter(config: import('./file-adapter.js').FileAuditConfig) {
  const { FileAuditAdapter } = await import('./file-adapter.js');
  return new FileAuditAdapter(config);
}
