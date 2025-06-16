export { EncryptedDataAdapter } from './encrypted-adapter.js';
export type { EncryptedDataConfig } from './encrypted-adapter.js';

/**
 * Factory function to create an encrypted data adapter
 */
export async function createEncryptedDataAdapter(
  config: import('./encrypted-adapter.js').EncryptedDataConfig
) {
  const { EncryptedDataAdapter } = await import('./encrypted-adapter.js');
  return new EncryptedDataAdapter(config);
}
