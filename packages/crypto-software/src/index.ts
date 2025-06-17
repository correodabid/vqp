import { SoftwareCryptoAdapter } from './software-adapter.js';

export { SoftwareCryptoAdapter } from './software-adapter.js';
export type { SoftwareCryptoConfig } from './software-adapter.js';

/**
 * Factory function to create a software crypto adapter
 */
export function createSoftwareCryptoAdapter(
  config: import('./software-adapter.js').SoftwareCryptoConfig = {}
): SoftwareCryptoAdapter {
  return new SoftwareCryptoAdapter(config);
}
