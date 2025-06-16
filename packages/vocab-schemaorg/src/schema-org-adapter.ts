/**
 * Schema.org Vocabulary Adapter for VQP
 * Converts Schema.org JSON-LD vocabularies to VQP-compatible JSON Schema format
 */

import { VocabularyPort } from '@vqp/core';

// Dynamic import for fetch polyfill in Node.js environments
async function getFetch() {
  if (typeof globalThis.fetch !== 'undefined') {
    return globalThis.fetch;
  }

  try {
    const { default: nodeFetch } = await import('node-fetch');
    return nodeFetch as any;
  } catch {
    console.warn('node-fetch not available, using fallback vocabularies');
    throw new Error('Fetch not available for dynamic vocabulary loading');
  }
}

export interface SchemaOrgConfig {
  cacheTimeoutMs?: number;
  allowedTypes?: string[];
  schemaOrgVersion?: string;
  contextUrl?: string;
}

interface _SchemaOrgType {
  '@id': string;
  '@type': string;
  'rdfs:label': string;
  'rdfs:comment': string;
  'rdfs:subClassOf'?: { '@id': string };
  domainIncludes?: Array<{ '@id': string }>;
  rangeIncludes?: Array<{ '@id': string }>;
}

interface _SchemaOrgProperty {
  '@id': string;
  '@type': string;
  'rdfs:label': string;
  'rdfs:comment': string;
  domainIncludes: Array<{ '@id': string }>;
  rangeIncludes?: Array<{ '@id': string }>;
}

export class SchemaOrgVocabularyAdapter implements VocabularyPort {
  private cache: Map<string, any> = new Map();
  private readonly cacheTimeout: number;
  private readonly contextUrl: string;
  private schemaOrgContext: any = null;

  constructor(private config: SchemaOrgConfig = {}) {
    this.cacheTimeout = config.cacheTimeoutMs || 3600000; // 1 hour
    this.contextUrl = config.contextUrl || 'https://schema.org/docs/jsonldcontext.json';
  }

  async resolveVocabulary(uri: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(uri);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.schema;
    }

    let schema: any;

    if (uri.startsWith('schema.org:') || uri.startsWith('https://schema.org/')) {
      schema = await this.resolveSchemaOrgVocabulary(uri);
    } else {
      throw new Error(`Unsupported vocabulary URI: ${uri}`);
    }

    // Cache the result
    await this.cacheVocabulary(uri, schema);
    return schema;
  }

  async validateAgainstVocabulary(data: any, vocabulary: any): Promise<boolean> {
    // Use JSON Schema validation
    try {
      // Simple validation - in production, use a proper JSON Schema validator
      for (const [key, value] of Object.entries(data)) {
        if (vocabulary.properties && vocabulary.properties[key]) {
          const property = vocabulary.properties[key];
          if (!this.validateProperty(value, property)) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async cacheVocabulary(uri: string, schema: any): Promise<void> {
    this.cache.set(uri, {
      schema,
      timestamp: Date.now(),
    });
  }

  private async resolveSchemaOrgVocabulary(uri: string): Promise<any> {
    // Parse the Schema.org type from URI
    const typeName = this.extractTypeName(uri);

    // Load Schema.org context if not already loaded
    if (!this.schemaOrgContext) {
      await this.loadSchemaOrgContext();
    }

    // Convert Schema.org type to VQP JSON Schema
    return this.convertToVQPSchema(typeName);
  }

  private extractTypeName(uri: string): string {
    if (uri.startsWith('schema.org:')) {
      return uri.replace('schema.org:', '');
    } else if (uri.startsWith('https://schema.org/')) {
      return uri.replace('https://schema.org/', '');
    }
    throw new Error(`Invalid Schema.org URI: ${uri}`);
  }

  private async loadSchemaOrgContext(): Promise<void> {
    // Fetch Schema.org vocabulary dynamically from the official sources
    try {
      const fetchFn = await getFetch();

      console.log('🌐 Loading Schema.org vocabularies dynamically...');

      // Load the JSON-LD context from Schema.org
      const contextResponse = await fetchFn(this.contextUrl);
      if (!contextResponse.ok) {
        throw new Error(`Failed to fetch Schema.org context: ${contextResponse.statusText}`);
      }
      // Load the JSON-LD context - currently not used but available for future enhancements
      const _contextData = await contextResponse.json();

      // Load the complete Schema.org vocabulary graph
      const vocabResponse = await fetchFn(
        'https://schema.org/version/latest/schemaorg-current-https.jsonld'
      );
      if (!vocabResponse.ok) {
        throw new Error(`Failed to fetch Schema.org vocabulary: ${vocabResponse.statusText}`);
      }
      const vocabData = await vocabResponse.json();

      console.log('✅ Schema.org vocabularies loaded successfully from schema.org');

      // Parse and process the Schema.org data
      this.schemaOrgContext = this.parseSchemaOrgVocabulary(vocabData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        '⚠️  Failed to load Schema.org vocabulary dynamically, using fallback definitions:',
        errorMessage
      );
      // Fallback to minimal cached definitions for offline use
      this.schemaOrgContext = this.getFallbackSchemaOrgTypes();
    }
  }

  /**
   * Parse Schema.org JSON-LD vocabulary into VQP-compatible format
   */
  private parseSchemaOrgVocabulary(vocabData: any): any {
    const parsedTypes: any = {};

    if (!vocabData['@graph']) {
      throw new Error('Invalid Schema.org vocabulary format: missing @graph');
    }

    // First pass: collect all types
    const types = new Map<string, any>();
    const properties = new Map<string, any>();

    for (const item of vocabData['@graph']) {
      if (item['@type'] === 'rdfs:Class') {
        const typeName = this.extractTypeNameFromId(item['@id']);
        if (typeName) {
          types.set(typeName, item);
        }
      } else if (item['@type'] === 'rdf:Property') {
        const propName = this.extractTypeNameFromId(item['@id']);
        if (propName) {
          properties.set(propName, item);
        }
      }
    }

    // Second pass: build type definitions with properties
    for (const [typeName, typeData] of types) {
      const typeProperties: any = {};

      // Find properties that belong to this type
      for (const [propName, propData] of properties) {
        if (this.propertyBelongsToType(propData, typeName)) {
          typeProperties[propName] = this.convertPropertyToJsonSchema(propData);
        }
      }

      parsedTypes[typeName] = {
        properties: typeProperties,
        description: typeData['rdfs:comment'] || `Schema.org ${typeName} type`,
      };
    }

    return parsedTypes;
  }

  /**
   * Extract type name from Schema.org @id
   */
  private extractTypeNameFromId(id: string): string | null {
    if (typeof id !== 'string') return null;

    // Handle different Schema.org ID formats
    if (id.startsWith('schema:')) {
      return id.replace('schema:', '');
    } else if (id.startsWith('https://schema.org/')) {
      return id.replace('https://schema.org/', '');
    } else if (id.includes('#')) {
      return id.split('#').pop() || null;
    }

    return null;
  }

  /**
   * Check if a property belongs to a specific type
   */
  private propertyBelongsToType(propData: any, typeName: string): boolean {
    if (!propData['schema:domainIncludes']) return false;

    const domains = Array.isArray(propData['schema:domainIncludes'])
      ? propData['schema:domainIncludes']
      : [propData['schema:domainIncludes']];

    return domains.some((domain: any) => {
      const domainType = this.extractTypeNameFromId(domain['@id']);
      return domainType === typeName;
    });
  }

  /**
   * Convert Schema.org property to JSON Schema format
   */
  private convertPropertyToJsonSchema(propData: any): any {
    const schema: any = {
      description: propData['rdfs:comment'] || propData['schema:comment'] || 'Schema.org property',
    };

    // Determine type from range
    if (propData['schema:rangeIncludes']) {
      const ranges = Array.isArray(propData['schema:rangeIncludes'])
        ? propData['schema:rangeIncludes']
        : [propData['schema:rangeIncludes']];

      const types = ranges.map((range: any) => this.extractTypeNameFromId(range['@id']));

      // Determine JSON Schema type based on Schema.org range
      if (types.includes('Text') || types.includes('URL')) {
        schema.type = 'string';
      } else if (types.includes('Number') || types.includes('Integer')) {
        schema.type = types.includes('Integer') ? 'integer' : 'number';
      } else if (types.includes('Boolean')) {
        schema.type = 'boolean';
      } else if (types.includes('Date')) {
        schema.type = 'string';
        schema.format = 'date';
      } else if (types.includes('DateTime')) {
        schema.type = 'string';
        schema.format = 'date-time';
      } else {
        // Reference to another Schema.org type
        const refType = types.find(
          (t) =>
            t && !['Text', 'URL', 'Number', 'Integer', 'Boolean', 'Date', 'DateTime'].includes(t)
        );
        if (refType) {
          schema.$ref = `#/definitions/${refType}`;
        } else {
          schema.type = 'string'; // Default fallback
        }
      }
    } else {
      schema.type = 'string'; // Default
    }

    return schema;
  }

  /**
   * Provide fallback Schema.org types for offline use
   */
  private getFallbackSchemaOrgTypes(): any {
    // Minimal fallback definitions for common types
    return {
      Person: {
        properties: {
          name: { type: 'string', description: 'The name of the person' },
          givenName: { type: 'string', description: 'Given name' },
          familyName: { type: 'string', description: 'Family name' },
          email: { type: 'string', format: 'email', description: 'Email address' },
          birthDate: { type: 'string', format: 'date', description: 'Date of birth' },
          nationality: { type: 'string', description: 'Nationality' },
          jobTitle: { type: 'string', description: 'Job title' },
          worksFor: { $ref: '#/definitions/Organization', description: 'Organization' },
        },
        description: 'A person (alive, dead, undead, or fictional)',
      },
      Organization: {
        properties: {
          name: { type: 'string', description: 'The name of the organization' },
          legalName: { type: 'string', description: 'Legal name' },
          email: { type: 'string', format: 'email', description: 'Email address' },
          url: { type: 'string', format: 'uri', description: 'Website URL' },
          numberOfEmployees: { type: 'integer', minimum: 0, description: 'Number of employees' },
          foundingDate: { type: 'string', format: 'date', description: 'Founding date' },
        },
        description: 'An organization such as a school, NGO, corporation, club, etc.',
      },
      Product: {
        properties: {
          name: { type: 'string', description: 'Product name' },
          description: { type: 'string', description: 'Product description' },
          sku: { type: 'string', description: 'Stock keeping unit' },
          brand: { type: 'string', description: 'Brand name' },
          manufacturer: { $ref: '#/definitions/Organization', description: 'Manufacturer' },
        },
        description: 'Any offered product or service',
      },
      Event: {
        properties: {
          name: { type: 'string', description: 'Event name' },
          description: { type: 'string', description: 'Event description' },
          startDate: { type: 'string', format: 'date-time', description: 'Start date and time' },
          endDate: { type: 'string', format: 'date-time', description: 'End date and time' },
          location: { $ref: '#/definitions/Place', description: 'Event location' },
        },
        description: 'An event happening at a certain time and location',
      },
      Place: {
        properties: {
          name: { type: 'string', description: 'Place name' },
          address: { type: 'string', description: 'Physical address' },
          geo: { $ref: '#/definitions/GeoCoordinates', description: 'Geographic coordinates' },
        },
        description: 'Entities that have a somewhat fixed, physical extension',
      },
      GeoCoordinates: {
        properties: {
          latitude: { type: 'number', description: 'Latitude in decimal degrees' },
          longitude: { type: 'number', description: 'Longitude in decimal degrees' },
        },
        description: 'The geographic coordinates of a place or event',
      },
    };
  }

  private convertToVQPSchema(typeName: string): any {
    const schemaOrgType = this.schemaOrgContext[typeName];
    if (!schemaOrgType) {
      throw new Error(`Schema.org type '${typeName}' not found`);
    }

    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: `https://schema.org/${typeName}`,
      title: `Schema.org ${typeName} Vocabulary`,
      description: `VQP-compatible vocabulary based on Schema.org ${typeName} type`,
      type: 'object',
      ...schemaOrgType,
      definitions: this.getDefinitions(),
    };
  }

  private getDefinitions(): any {
    // Return all Schema.org types as definitions for cross-references
    const definitions: any = {};
    for (const [typeName, typeSchema] of Object.entries(this.schemaOrgContext)) {
      definitions[typeName] = {
        type: 'object',
        ...(typeSchema as any),
      };
    }
    return definitions;
  }

  private validateProperty(value: any, property: any): boolean {
    // Simple property validation
    switch (property.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
      case 'integer':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Allow unknown types
    }
  }

  async isVocabularyAllowed(uri: string): Promise<boolean> {
    // Check if the URI is a supported Schema.org vocabulary
    if (uri.startsWith('schema.org:') || uri.includes('schema.org')) {
      // Extract type name and check if it's supported
      try {
        const typeName = this.extractTypeName(uri);
        return this.isTypeSupported(typeName);
      } catch {
        return false;
      }
    }
    return false;
  }

  private isTypeSupported(typeName: string): boolean {
    // Check if the type is in our supported Schema.org context
    return this.schemaOrgContext && typeName in this.schemaOrgContext;
  }
}

/**
 * Factory function to create a Schema.org vocabulary adapter
 */
export function createSchemaOrgVocabularyAdapter(
  config?: SchemaOrgConfig
): SchemaOrgVocabularyAdapter {
  return new SchemaOrgVocabularyAdapter(config);
}
