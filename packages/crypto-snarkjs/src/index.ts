import { SnarkjsCryptoAdapter } from './snarkjs-adapter.js';

export { SnarkjsCryptoAdapter } from './snarkjs-adapter.js';
export type { SnarkjsConfig } from './snarkjs-adapter.js';

/**
 * Factory function to create a SNARKjs crypto adapter
 */
export function createSnarkjsCryptoAdapter(
  config: import('./snarkjs-adapter.js').SnarkjsConfig = {}
): SnarkjsCryptoAdapter {
  return new SnarkjsCryptoAdapter(config);
}
