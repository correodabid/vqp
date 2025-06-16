export { SnarkjsCryptoAdapter } from './snarkjs-adapter.js';
export type { SnarkjsConfig } from './snarkjs-adapter.js';

/**
 * Factory function to create a SNARKjs crypto adapter
 */
export async function createSnarkjsCryptoAdapter(
  config: import('./snarkjs-adapter.js').SnarkjsConfig = {}
) {
  const { SnarkjsCryptoAdapter } = await import('./snarkjs-adapter.js');
  return new SnarkjsCryptoAdapter(config);
}
