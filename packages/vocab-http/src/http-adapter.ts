/**
 * HTTP Vocabulary Adapter - Implements VocabularyPort using HTTP requests
 * This adapter fetches vocabulary schemas from HTTP endpoints with caching
 */

import { VocabularyPort } from '@vqp/core';

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
      } else if (uri.startsWith('schema.org:') || uri.includes('schema.org')) {
        // Schema.org vocabulary - basic support
        schema = await this.getSchemaOrgVocabulary(uri);
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
          has_passport: { type: 'boolean' },
          email_verified: { type: 'boolean' },
          phone_verified: { type: 'boolean' },
          government_id_verified: { type: 'boolean' },
          biometric_verified: { type: 'boolean' },
        },
      },
      'vqp:financial:v1': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'VQP Financial Vocabulary v1.0.0',
        type: 'object',
        properties: {
          annual_income: { type: 'integer', minimum: 0 },
          monthly_income: { type: 'integer', minimum: 0 },
          employment_status: {
            type: 'string',
            enum: ['employed', 'self_employed', 'unemployed', 'retired', 'student'],
          },
          employment_duration_months: { type: 'integer', minimum: 0 },
          credit_score: { type: 'integer', minimum: 300, maximum: 850 },
          has_bank_account: { type: 'boolean' },
          debt_to_income_ratio: { type: 'number', minimum: 0, maximum: 10 },
          tax_resident_country: { type: 'string', pattern: '^[A-Z]{2}$' },
          assets_verified: { type: 'boolean' },
        },
      },
      'vqp:health:v1': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'VQP Health Vocabulary v1.0.0',
        type: 'object',
        properties: {
          vaccinations_completed: {
            type: 'array',
            items: { type: 'string' },
          },
          covid_vaccination_doses: { type: 'integer', minimum: 0 },
          last_vaccination_date: { type: 'string', format: 'date' },
          blood_type: {
            type: 'string',
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
          },
          allergies: {
            type: 'array',
            items: { type: 'string' },
          },
          chronic_conditions: {
            type: 'array',
            items: { type: 'string' },
          },
          medical_device_implanted: { type: 'boolean' },
          pregnant: { type: 'boolean' },
          recent_surgery_90_days: { type: 'boolean' },
          insurance_verified: { type: 'boolean' },
        },
      },
      'vqp:metrics:v1': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'VQP System Metrics Vocabulary v1.0.0',
        type: 'object',
        properties: {
          uptime_percentage_24h: { type: 'number', minimum: 0, maximum: 100 },
          uptime_percentage_7d: { type: 'number', minimum: 0, maximum: 100 },
          response_time_p50_ms: { type: 'number', minimum: 0 },
          response_time_p95_ms: { type: 'number', minimum: 0 },
          response_time_p99_ms: { type: 'number', minimum: 0 },
          error_rate_percentage: { type: 'number', minimum: 0, maximum: 100 },
          throughput_rps: { type: 'number', minimum: 0 },
          processed_events_last_hour: { type: 'integer', minimum: 0 },
          cpu_usage_percentage: { type: 'number', minimum: 0, maximum: 100 },
          memory_usage_percentage: { type: 'number', minimum: 0, maximum: 100 },
          disk_usage_percentage: { type: 'number', minimum: 0, maximum: 100 },
          health_status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy', 'unknown'],
          },
        },
      },
      'vqp:academic:v1': {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'VQP Academic Vocabulary v1.0.0',
        type: 'object',
        properties: {
          degrees_earned: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'high_school',
                'associates',
                'bachelors',
                'masters',
                'doctorate',
                'professional',
              ],
            },
          },
          graduation_year: { type: 'integer', minimum: 1900, maximum: 2100 },
          gpa: { type: 'number', minimum: 0.0, maximum: 4.0 },
          enrollment_status: {
            type: 'string',
            enum: ['enrolled', 'graduated', 'withdrawn', 'suspended'],
          },
          credit_hours_current: { type: 'integer', minimum: 0 },
          degree_level: {
            type: 'string',
            enum: ['undergraduate', 'graduate', 'postgraduate'],
          },
          major_field: { type: 'string' },
          transcripts_verified: { type: 'boolean' },
          honors_received: {
            type: 'array',
            items: { type: 'string' },
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
   * Get basic Schema.org vocabulary schemas (simplified support)
   * For full Schema.org support, use @vqp/vocab-schemaorg package
   */
  private async getSchemaOrgVocabulary(uri: string): Promise<any> {
    // Extract type name from URI
    let typeName: string;
    if (uri.startsWith('schema.org:')) {
      typeName = uri.replace('schema.org:', '');
    } else if (uri.includes('schema.org/')) {
      const parts = uri.split('schema.org/');
      if (parts.length < 2 || !parts[1]) {
        throw new Error(`Invalid Schema.org URI: ${uri}`);
      }
      typeName = parts[1];
    } else {
      throw new Error(`Invalid Schema.org URI: ${uri}`);
    }

    // Basic Schema.org type mappings (limited subset)
    const schemaOrgTypes: Record<string, any> = {
      Person: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Schema.org Person (Basic)',
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name' },
          givenName: { type: 'string', description: 'First name' },
          familyName: { type: 'string', description: 'Last name' },
          email: { type: 'string', format: 'email', description: 'Email address' },
          age: { type: 'integer', minimum: 0, description: 'Age in years' },
          birthDate: { type: 'string', format: 'date', description: 'Birth date' },
          telephone: { type: 'string', description: 'Phone number' },
          nationality: { type: 'string', description: 'Nationality' },
          jobTitle: { type: 'string', description: 'Job title' },
        },
      },
      Organization: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Schema.org Organization (Basic)',
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Organization name' },
          legalName: { type: 'string', description: 'Legal name' },
          email: { type: 'string', format: 'email', description: 'Email' },
          telephone: { type: 'string', description: 'Phone number' },
          numberOfEmployees: { type: 'integer', minimum: 0, description: 'Employee count' },
          foundingDate: { type: 'string', format: 'date', description: 'Founding date' },
          industry: { type: 'string', description: 'Industry' },
          taxID: { type: 'string', description: 'Tax ID' },
        },
      },
      Product: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Schema.org Product (Basic)',
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name' },
          description: { type: 'string', description: 'Product description' },
          sku: { type: 'string', description: 'SKU' },
          brand: { type: 'string', description: 'Brand name' },
          model: { type: 'string', description: 'Model' },
          weight: { type: 'number', minimum: 0, description: 'Weight' },
        },
      },
    };

    const schema = schemaOrgTypes[typeName];
    if (!schema) {
      throw new Error(
        `Schema.org type '${typeName}' not supported in basic mode. Use @vqp/vocab-schemaorg for full support.`
      );
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
