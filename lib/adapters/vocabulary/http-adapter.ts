/**
 * HTTP Vocabulary Adapter - Implements VocabularyPort using HTTP requests
 * This adapter fetches vocabulary schemas from HTTP endpoints with caching
 */

import { VocabularyPort } from '../../domain/ports/secondary.js';

export interface HTTPVocabularyConfig {
  cacheTimeoutMs?: number;
  allowedVocabularies?: string[];
  defaultVocabularies?: Record<string, any>;
}

interface CacheEntry {
  schema: any;
  timestamp: number;
}

export class HTTPVocabularyAdapter implements VocabularyPort {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTimeout: number;

  constructor(private config: HTTPVocabularyConfig = {}) {
    this.cacheTimeout = config.cacheTimeoutMs || 3600000; // 1 hour default
    this.initializeDefaultVocabularies();
  }

  async resolveVocabulary(uri: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(uri);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.schema;
    }

    try {
      let schema: any;

      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        // Fetch from HTTP
        schema = await this.fetchFromHTTP(uri);
      } else if (uri.startsWith('vqp:')) {
        // Built-in VQP vocabulary
        schema = await this.getBuiltinVocabulary(uri);
      } else {
        throw new Error(`Unsupported vocabulary URI scheme: ${uri}`);
      }

      // Cache the result
      await this.cacheVocabulary(uri, schema);

      return schema;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to resolve vocabulary ${uri}:`, error);
      throw new Error(`Vocabulary resolution failed: ${errorMessage}`);
    }
  }

  async validateAgainstVocabulary(data: any, vocabulary: any): Promise<boolean> {
    // Basic validation - in production, use a proper JSON Schema validator like AJV
    try {
      if (!vocabulary || !vocabulary.properties) {
        return true; // No validation constraints
      }

      // Check if data contains only allowed properties
      const traverse = (obj: any, path: string[] = []): boolean => {
        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
          if (obj.var && typeof obj.var === 'string') {
            // This is a JSONLogic variable reference
            const varPath = obj.var.split('.');
            return this.isPathAllowed(varPath, vocabulary);
          }

          // Recursively check object properties
          return Object.values(obj).every((value) => traverse(value, path));
        } else if (Array.isArray(obj)) {
          return obj.every((item) => traverse(item, path));
        }
        return true;
      };

      return traverse(data);
    } catch (error) {
      console.error('Vocabulary validation error:', error);
      return false;
    }
  }

  async cacheVocabulary(uri: string, schema: any): Promise<void> {
    this.cache.set(uri, {
      schema,
      timestamp: Date.now(),
    });
  }

  async isVocabularyAllowed(uri: string): Promise<boolean> {
    if (!this.config.allowedVocabularies) {
      return true; // No restrictions
    }

    return (
      this.config.allowedVocabularies.includes(uri) || this.config.allowedVocabularies.includes('*')
    );
  }

  /**
   * Fetch vocabulary schema from HTTP endpoint
   */
  private async fetchFromHTTP(uri: string): Promise<any> {
    // In a real implementation, use fetch() or a HTTP client
    // For now, return a mock response
    throw new Error('HTTP vocabulary fetching not yet implemented');
  }

  /**
   * Get built-in VQP vocabulary schemas
   */
  private async getBuiltinVocabulary(uri: string): Promise<any> {
    const vocabularies: Record<string, any> = {
      'vqp:identity:v1': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'VQP Identity Vocabulary v1.0.0',
        type: 'object',
        properties: {
          age: { type: 'integer', minimum: 0, maximum: 150 },
          citizenship: { type: 'string', pattern: '^[A-Z]{2}$' },
          has_drivers_license: { type: 'boolean' },
          email_verified: { type: 'boolean' },
        },
      },
      'vqp:financial:v1': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'VQP Financial Vocabulary v1.0.0',
        type: 'object',
        properties: {
          annual_income: { type: 'integer', minimum: 0 },
          employment_status: {
            type: 'string',
            enum: ['employed', 'self_employed', 'unemployed', 'retired', 'student'],
          },
          employment_duration_months: { type: 'integer', minimum: 0 },
          has_bank_account: { type: 'boolean' },
        },
      },
      'vqp:metrics:v1': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'VQP System Metrics Vocabulary v1.0.0',
        type: 'object',
        properties: {
          uptime_percentage_24h: { type: 'number', minimum: 0, maximum: 100 },
          processed_events_last_hour: { type: 'integer', minimum: 0 },
          error_rate_percentage: { type: 'number', minimum: 0, maximum: 100 },
          health_status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy', 'unknown'],
          },
        },
      },
    };

    const schema = vocabularies[uri];
    if (!schema) {
      throw new Error(`Unknown built-in vocabulary: ${uri}`);
    }

    return schema;
  }

  /**
   * Check if a data path is allowed by the vocabulary
   */
  private isPathAllowed(path: string[], vocabulary: any): boolean {
    if (!vocabulary.properties) {
      return true; // No restrictions
    }

    let current = vocabulary.properties;
    for (const segment of path) {
      if (!current[segment]) {
        return false; // Path not defined in vocabulary
      }

      // Move to nested properties if they exist
      if (current[segment].properties) {
        current = current[segment].properties;
      }
    }

    return true;
  }

  /**
   * Initialize default vocabularies from config
   */
  private initializeDefaultVocabularies(): void {
    if (this.config.defaultVocabularies) {
      for (const [uri, schema] of Object.entries(this.config.defaultVocabularies)) {
        this.cache.set(uri, {
          schema,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Clear the vocabulary cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}
