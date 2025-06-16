export { ConsoleAuditAdapter } from './console-adapter.js';
export type { ConsoleAuditConfig } from './console-adapter.js';

/**
 * Factory function to create a console audit adapter
 */
export async function createConsoleAuditAdapter(
  config: import('./console-adapter.js').ConsoleAuditConfig = {}
) {
  const { ConsoleAuditAdapter } = await import('./console-adapter.js');
  return new ConsoleAuditAdapter(config);
}
