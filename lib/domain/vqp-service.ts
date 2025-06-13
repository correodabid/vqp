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

export class VQPService {
  constructor(
    private dataAccess: DataAccessPort,
    private crypto: CryptographicPort,
    private vocabulary: VocabularyPort,
    private audit: AuditPort,
    private queryEvaluation: QueryEvaluationPort,
    private config: {
      maxQueryComplexity?: number;
      allowedVocabularies?: string[];
      rateLimits?: {
        queriesPerHour: number;
        queriesPerDay: number;
      };
    } = {}
  ) {}

  /**
   * Main entry point for processing VQP queries
   */
  async processQuery(query: VQPQuery): Promise<VQPResponse> {
    try {
      // 1. Validate query structure and timing
      await this.validateQueryStructure(query);

      // 2. Resolve and validate vocabulary
      const vocabulary = await this.vocabulary.resolveVocabulary(query.query.vocab);
      if (!vocabulary) {
        throw this.createError(
          'VOCABULARY_NOT_FOUND',
          `Vocabulary not found: ${query.query.vocab}`
        );
      }

      // 3. Check if vocabulary is allowed
      if (!(await this.vocabulary.isVocabularyAllowed(query.query.vocab))) {
        throw this.createError('UNAUTHORIZED', `Vocabulary not allowed: ${query.query.vocab}`);
      }

      // 4. Validate query expression against vocabulary
      await this.vocabulary.validateAgainstVocabulary(query.query.expr, vocabulary);

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
   * Map vocabulary field to actual vault path
   */
  private mapVocabularyToVaultPath(field: string, vocabularyUri?: string): string[] {
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
   * Map vault path back to vocabulary field name
   */
  private mapVaultPathToVocabulary(path: string[], vocabularyUri?: string): string {
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
}
