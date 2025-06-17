import { EncryptedDataAdapter } from './encrypted-adapter.js';

export { EncryptedDataAdapter } from './encrypted-adapter.js';
export type { EncryptedDataConfig } from './encrypted-adapter.js';

/**
 * Factory function to create an encrypted data adapter
 */
export function createEncryptedDataAdapter(
  config: import('./encrypted-adapter.js').EncryptedDataConfig
): EncryptedDataAdapter {
  return new EncryptedDataAdapter(config);
}
