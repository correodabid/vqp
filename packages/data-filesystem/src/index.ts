import { FileSystemDataAdapter } from './filesystem-adapter.js';

export { FileSystemDataAdapter } from './filesystem-adapter.js';
export type { FileSystemDataConfig } from './filesystem-adapter.js';

/**
 * Factory function to create a filesystem data adapter
 */
export function createFileSystemDataAdapter(
  config: import('./filesystem-adapter.js').FileSystemDataConfig
): FileSystemDataAdapter {
  return new FileSystemDataAdapter(config);
}
