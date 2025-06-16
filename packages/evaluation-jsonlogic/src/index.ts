export { JSONLogicAdapter } from './jsonlogic-adapter.js';
export type { JSONLogicAdapterConfig } from './jsonlogic-adapter.js';

/**
 * Factory function to create a JSONLogic evaluation adapter
 */
export async function createJSONLogicAdapter(
  config: import('./jsonlogic-adapter.js').JSONLogicAdapterConfig = {}
) {
  const { JSONLogicAdapter } = await import('./jsonlogic-adapter.js');
  return new JSONLogicAdapter(config);
}
