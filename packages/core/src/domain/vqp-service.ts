/**
 * Core VQP Service - Pure business logic following hexagonal architecture
 * This service is completely isolated from external concerns
 */

import { VQPQuery, VQPResponse, VQPError } from './types.js';
import {
  DataAccessPort,
  CryptographicPort,
  VocabularyPort,
  AuditPort,
  QueryEvaluationPort,
} from './ports/secondary.js';

export interface VocabularyMapping {
  /**
   * Map vocabulary field to vault path
   * @param field The field name from the vocabulary
   * @param vocabularyUri The vocabulary URI for context
   * @returns Array representing the path in the vault
   */
  toVaultPath(field: string, vocabularyUri?: string): string[];

  /**
   * Map vault path back to vocabulary field
   * @param path The path in the vault
   * @param vocabularyUri The vocabulary URI for context
   * @returns The field name as it should appear in the vocabulary
   */
  toVocabularyField(path: string[], vocabularyUri?: string): string;
}

/**
 * Default vocabulary mapping for standard VQP vocabularies
 */
export class StandardVocabularyMapping implements VocabularyMapping {
  toVaultPath(field: string, vocabularyUri?: string): string[] {
    // If field already contains dots, split as-is
    if (field.includes('.')) {
      return field.split('.');
    }

    // Map vocabulary fields to vault structure
    if (vocabularyUri) {
      switch (vocabularyUri) {
        case 'vqp:identity:v1':
          return ['personal', field];
        case 'vqp:financial:v1':
          return ['financial', field];
        case 'vqp:health:v1':
          return ['health', field];
        case 'vqp:academic:v1':
          return ['academic', field];
        case 'vqp:metrics:v1':
          return ['system', field];
        default:
          // Unknown vocabulary, assume top-level
          return [field];
      }
    }

    // Default: assume top-level field
    return [field];
  }

  toVocabularyField(path: string[], vocabularyUri?: string): string {
    // If path has multiple segments and matches known patterns, extract field name
    if (path.length >= 2 && vocabularyUri) {
      const category = path[0];
      const field = path[1];

      if (category && field) {
        switch (vocabularyUri) {
          case 'vqp:identity:v1':
            if (category === 'personal') return field;
            break;
          case 'vqp:financial:v1':
            if (category === 'financial') return field;
            break;
          case 'vqp:health:v1':
            if (category === 'health') return field;
            break;
          case 'vqp:academic:v1':
            if (category === 'academic') return field;
            break;
          case 'vqp:metrics:v1':
            if (category === 'system') return field;
            break;
        }
      }
    }

    // Fallback: use last segment or join with dots
    const lastSegment = path[path.length - 1];
    return path.length === 1 && lastSegment ? lastSegment : path.join('.');
  }
}

/**
 * Simple flat vocabulary mapping (all fields at top level)
 */
export class FlatVocabularyMapping implements VocabularyMapping {
  toVaultPath(field: string, _vocabularyUri?: string): string[] {
    return field.includes('.') ? field.split('.') : [field];
  }

  toVocabularyField(path: string[], _vocabularyUri?: string): string {
    return path.join('.');
  }
}

export class VQPService {
  private vocabularyMapping: VocabularyMapping;

  constructor(
    private dataAccess: DataAccessPort,
    private crypto: CryptographicPort,
    private audit: AuditPort,
    private queryEvaluation: QueryEvaluationPort,
    private vocabulary?: VocabularyPort, // Now optional
    private config: {
      maxQueryComplexity?: number;
      allowedVocabularies?: string[];
      rateLimits?: {
        queriesPerHour: number;
        queriesPerDay: number;
      };
      vocabularyMapping?: VocabularyMapping;
    } = {}
  ) {
    // Use provided mapping or default to standard mapping
    this.vocabularyMapping = config.vocabularyMapping || new StandardVocabularyMapping();
  }

  /**
   * Main entry point for processing VQP queries
   *
   * @param query The VQP query to process
   * @param providedVocabulary Optional vocabulary schema. If not provided, will use vocabulary adapter
   */
  async processQuery(query: VQPQuery, providedVocabulary?: any): Promise<VQPResponse> {
    try {
      // 1. Validate query structure and timing
      await this.validateQueryStructure(query);

      // 2. Resolve vocabulary (from parameter or adapter)
      const vocabulary = await this.getVocabulary(query.query.vocab, providedVocabulary);

      // 3. Check if vocabulary is allowed
      if (!(await this.isVocabularyAllowed(query.query.vocab))) {
        throw this.createError('UNAUTHORIZED', `Vocabulary not allowed: ${query.query.vocab}`);
      }

      // 4. Validate query expression against vocabulary
      await this.validateAgainstVocabulary(query.query.expr, vocabulary);

      // 5. Extract required data paths from query expression
      const requiredPaths = this.extractDataPaths(query.query.expr, query.query.vocab);

      // 6. Check data access permissions
      for (const path of requiredPaths) {
        if (!(await this.dataAccess.validateDataAccess(path, query.requester))) {
          throw this.createError('UNAUTHORIZED', `Access denied to data path: ${path.join('.')}`);
        }
      }

      // 7. Gather required data
      const data = await this.gatherData(requiredPaths, query.query.vocab);

      // 8. Evaluate query using the injected evaluation adapter
      const result = await this.evaluateQuery(query.query.expr, data);

      // 9. Generate timestamp for response
      const responseTimestamp = new Date().toISOString();
      const responderDID = await this.getResponderDID();

      // 10. Generate cryptographic proof using the exact same data
      const proof = await this.generateProof(query, result, responseTimestamp, responderDID);

      // 11. Create response using the same timestamp used in proof
      const response: VQPResponse = {
        queryId: query.id,
        version: query.version,
        timestamp: responseTimestamp,
        responder: responderDID,
        result,
        proof,
      };

      // 11. Log successful query processing
      await this.audit.logQuery(query, response);

      return response;
    } catch (error) {
      // Log error and re-throw
      const vqpError =
        error instanceof Error
          ? this.createError('EVALUATION_ERROR', error.message)
          : (error as VQPError);

      await this.audit.logError(vqpError, { query });
      throw vqpError;
    }
  }

  /**
   * Validate the basic structure and timing of a query
   */
  private async validateQueryStructure(query: VQPQuery): Promise<void> {
    // Check required fields
    if (!query.id || !query.version || !query.timestamp || !query.requester || !query.query) {
      throw this.createError('INVALID_QUERY', 'Missing required fields');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(query.id)) {
      throw this.createError('INVALID_QUERY', 'Invalid query ID format');
    }

    // Validate timestamp (not too old, not in future)
    const queryTime = new Date(query.timestamp).getTime();
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const maxSkew = 1 * 60 * 1000; // 1 minute future

    if (now - queryTime > maxAge) {
      throw this.createError('INVALID_QUERY', 'Query timestamp too old');
    }

    if (queryTime - now > maxSkew) {
      throw this.createError('INVALID_QUERY', 'Query timestamp in future');
    }

    // Validate query language
    if (query.query.lang !== 'jsonlogic@1.0.0') {
      throw this.createError('INVALID_QUERY', `Unsupported query language: ${query.query.lang}`);
    }

    // Check query complexity
    if (this.config.maxQueryComplexity) {
      const complexity = this.calculateQueryComplexity(query.query.expr);
      if (complexity > this.config.maxQueryComplexity) {
        throw this.createError('INVALID_QUERY', 'Query too complex');
      }
    }
  }

  /**
   * Extract data paths from JSONLogic expression and map them to vault paths
   */
  private extractDataPaths(expr: any, vocabularyUri?: string): string[][] {
    const paths: string[][] = [];

    const traverse = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        if (obj.var && typeof obj.var === 'string') {
          // This is a variable reference - map it to vault path
          const vaultPath = this.mapVocabularyToVaultPath(obj.var, vocabularyUri);
          paths.push(vaultPath);
        } else {
          // Recursively traverse object properties
          Object.values(obj).forEach(traverse);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(traverse);
      }
    };

    traverse(expr);
    return paths;
  }

  /**
   * Map vocabulary field to actual vault path using configurable mapping
   */
  private mapVocabularyToVaultPath(field: string, vocabularyUri?: string): string[] {
    return this.vocabularyMapping.toVaultPath(field, vocabularyUri);
  }

  /**
   * Gather data for all required paths and reconstruct for vocabulary format
   */
  private async gatherData(
    paths: string[][],
    vocabularyUri?: string
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    for (const path of paths) {
      try {
        const value = await this.dataAccess.getData(path);

        // Map vault path back to vocabulary field for JSONLogic evaluation
        const vocabularyField = this.mapVaultPathToVocabulary(path, vocabularyUri);
        data[vocabularyField] = value;
      } catch (error) {
        // If data is not available, continue - JSONLogic will handle undefined
        console.warn(`Data not available for path: ${path.join('.')}`);
      }
    }

    return data;
  }

  /**
   * Map vault path back to vocabulary field name using configurable mapping
   */
  private mapVaultPathToVocabulary(path: string[], vocabularyUri?: string): string {
    return this.vocabularyMapping.toVocabularyField(path, vocabularyUri);
  }

  /**
   * Evaluate query using the injected evaluation port
   */
  private async evaluateQuery(expr: any, data: any): Promise<boolean | number | string | null> {
    try {
      return await this.queryEvaluation.evaluate(expr, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createError('EVALUATION_ERROR', `Query evaluation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate cryptographic proof for the response
   */
  private async generateProof(
    query: VQPQuery,
    result: any,
    timestamp: string,
    responderDID: string
  ): Promise<any> {
    const responsePayload = {
      queryId: query.id,
      result,
      timestamp,
      responder: responderDID,
    };

    const dataToSign = Buffer.from(JSON.stringify(responsePayload));
    return await this.crypto.sign(dataToSign, 'default');
  }

  /**
   * Calculate query complexity (for rate limiting)
   */
  private calculateQueryComplexity(expr: any): number {
    let complexity = 0;

    const traverse = (obj: any) => {
      complexity++;
      if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(traverse);
      } else if (Array.isArray(obj)) {
        obj.forEach(traverse);
      }
    };

    traverse(expr);
    return complexity;
  }

  /**
   * Get the DID of this responder
   */
  private async getResponderDID(): Promise<string> {
    // This would typically be configured or derived from the cryptographic key
    return 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp';
  }

  /**
   * Create a VQP error with consistent structure
   */
  private createError(code: VQPError['code'], message: string, details?: any): VQPError {
    return new VQPError(code, message, details);
  }

  /**
   * Get vocabulary either from provided parameter or vocabulary adapter
   */
  private async getVocabulary(uri: string, providedVocabulary?: any): Promise<any> {
    if (providedVocabulary) {
      return providedVocabulary;
    }

    if (this.vocabulary) {
      const vocabulary = await this.vocabulary.resolveVocabulary(uri);
      if (!vocabulary) {
        throw this.createError('VOCABULARY_NOT_FOUND', `Vocabulary not found: ${uri}`);
      }
      return vocabulary;
    }

    throw this.createError(
      'VOCABULARY_NOT_FOUND',
      `No vocabulary provided for ${uri} and no vocabulary resolver configured. Pass vocabulary directly or configure a vocabulary adapter.`
    );
  }

  /**
   * Check if vocabulary is allowed
   */
  private async isVocabularyAllowed(uri: string): Promise<boolean> {
    // Check config-based allowed vocabularies
    if (this.config.allowedVocabularies) {
      if (
        !this.config.allowedVocabularies.includes(uri) &&
        !this.config.allowedVocabularies.includes('*')
      ) {
        return false;
      }
    }

    // Check vocabulary adapter if available
    if (this.vocabulary) {
      return await this.vocabulary.isVocabularyAllowed(uri);
    }

    return true; // No restrictions if no vocabulary adapter
  }

  /**
   * Validate query expression against vocabulary
   */
  private async validateAgainstVocabulary(expr: any, vocabulary: any): Promise<void> {
    // Use vocabulary adapter if available for basic checks
    if (this.vocabulary) {
      // Only validate basic structure, not strict property existence
      // Let JSONLogic handle undefined properties naturally (they become false/undefined)
      const hasValidStructure = await this.vocabulary.validateAgainstVocabulary(expr, vocabulary);
      if (!hasValidStructure) {
        // Only throw error for structural issues, not missing properties
        const hasUnknownProperties = this.hasUnknownProperties(expr, vocabulary);
        if (!hasUnknownProperties) {
          throw this.createError('INVALID_QUERY', 'Query expression has invalid structure');
        }
        // If it's just unknown properties, let it continue and return false naturally
      }
      return;
    }

    // Basic validation if no vocabulary adapter
    await this.basicVocabularyValidation(expr, vocabulary);
  }

  /**
   * Check if expression contains unknown properties (but don't treat as error)
   */
  private hasUnknownProperties(expr: any, vocabulary: any): boolean {
    if (!vocabulary || !vocabulary.properties) {
      return false;
    }

    const checkProperties = (obj: any): boolean => {
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        if (obj.var && typeof obj.var === 'string') {
          const varPath = obj.var.split('.');
          return !vocabulary.properties[varPath[0]];
        }
        return Object.values(obj).some((value) => checkProperties(value));
      } else if (Array.isArray(obj)) {
        return obj.some((item) => checkProperties(item));
      }
      return false;
    };

    return checkProperties(expr);
  }

  /**
   * Basic vocabulary validation when no adapter is available
   */
  private async basicVocabularyValidation(expr: any, vocabulary: any): Promise<void> {
    if (!vocabulary || !vocabulary.properties) {
      return; // No validation constraints
    }

    // Extract variables used in the expression
    const usedVars = await this.queryEvaluation.extractVariables(expr);

    // Check if all used variables are defined in vocabulary
    for (const variable of usedVars) {
      const varPath = variable.split('.');
      if (!this.isPathAllowedInVocabulary(varPath, vocabulary)) {
        throw this.createError('INVALID_QUERY', `Variable '${variable}' not allowed in vocabulary`);
      }
    }
  }

  /**
   * Check if a data path is allowed by the vocabulary
   */
  private isPathAllowedInVocabulary(path: string[], vocabulary: any): boolean {
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
}
