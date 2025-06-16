export { FileSystemDataAdapter } from './filesystem-adapter.js';
export type { FileSystemDataConfig } from './filesystem-adapter.js';

/**
 * Factory function to create a filesystem data adapter
 */
export async function createFileSystemDataAdapter(
  config: import('./filesystem-adapter.js').FileSystemDataConfig
) {
  return new (await import('./filesystem-adapter.js')).FileSystemDataAdapter(config);
}
