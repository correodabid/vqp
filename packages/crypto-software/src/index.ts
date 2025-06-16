export { SoftwareCryptoAdapter } from './software-adapter.js';
export type { SoftwareCryptoConfig } from './software-adapter.js';

/**
 * Factory function to create a software crypto adapter
 */
export async function createSoftwareCryptoAdapter(
  config: import('./software-adapter.js').SoftwareCryptoConfig = {}
) {
  const { SoftwareCryptoAdapter } = await import('./software-adapter.js');
  return new SoftwareCryptoAdapter(config);
}
