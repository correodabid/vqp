/**
 * JSONLogic Evaluation Adapter
 * Implements QueryEvaluationPort using json-logic-js library
 */

import jsonlogic from 'json-logic-js';
import { QueryEvaluationPort } from '../../domain/ports/secondary.js';

export interface JSONLogicAdapterConfig {
  allowCustomOperations?: boolean;
  securityMode?: 'strict' | 'permissive';
}

/**
 * JSONLogic adapter for query evaluation
 * This adapter provides safe evaluation of JSONLogic expressions
 */
export class JSONLogicAdapter implements QueryEvaluationPort {
  private config: JSONLogicAdapterConfig;
  private dangerousOperations = ['eval', 'function', 'constructor', '__proto__', 'prototype'];

  constructor(config: JSONLogicAdapterConfig = {}) {
    this.config = {
      allowCustomOperations: false,
      securityMode: 'strict',
      ...config,
    };
  }

  /**
   * Evaluate JSONLogic expression against data
   */
  async evaluate(expression: any, data: any = {}): Promise<any> {
    try {
      console.log('JSONLogicAdapter.evaluate called with:');
      console.log('Expression:', JSON.stringify(expression));
      console.log('Data keys:', Object.keys(data));

      // Validate expression first
      if (!(await this.isValidExpression(expression))) {
        throw new Error('Invalid JSONLogic expression');
      }

      // Sanitize in strict mode
      if (this.config.securityMode === 'strict') {
        expression = await this.sanitizeExpression(expression);
      }

      // Evaluate using json-logic-js
      const result = jsonlogic.apply(expression, data);
      console.log('JSONLogic result:', result);
      return result;
    } catch (error) {
      console.log('JSONLogic error:', error);
      throw new Error(
        `JSONLogic evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if expression is valid JSONLogic
   */
  async isValidExpression(expression: any): Promise<boolean> {
    try {
      console.log('Validating expression:', JSON.stringify(expression));
      if (typeof expression !== 'object' || expression === null) {
        console.log('Expression is not an object');
        return false;
      }

      // Try to apply with empty data to check for syntax errors
      const result = jsonlogic.apply(expression, {});
      console.log('Validation result:', result);
      return true;
    } catch (error) {
      console.log('Validation error:', error);
      return false;
    }
  }

  /**
   * Extract variables used in expression
   */
  async extractVariables(expression: any): Promise<string[]> {
    try {
      const variables = jsonlogic.uses_data(expression);
      return Array.isArray(variables) ? variables : [];
    } catch (error) {
      throw new Error(
        `Failed to extract variables: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Sanitize expression for security
   * Removes potentially dangerous operations
   */
  async sanitizeExpression(expression: any): Promise<any> {
    const sanitizeRecursive = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeRecursive);
      } else if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Filter out dangerous operations
          if (!this.dangerousOperations.includes(key)) {
            sanitized[key] = sanitizeRecursive(value);
          }
        }
        return sanitized;
      }
      return obj;
    };

    return sanitizeRecursive(expression);
  }

  /**
   * Add custom operation to JSONLogic (if allowed)
   */
  addOperation(name: string, operation: (...args: any[]) => any): void {
    if (!this.config.allowCustomOperations) {
      throw new Error('Custom operations are not allowed in this adapter configuration');
    }

    if (this.dangerousOperations.includes(name)) {
      throw new Error(`Operation "${name}" is not allowed for security reasons`);
    }

    jsonlogic.add_operation(name, operation);
  }

  /**
   * Remove custom operation from JSONLogic
   */
  removeOperation(name: string): void {
    if (!this.config.allowCustomOperations) {
      throw new Error('Custom operations are not allowed in this adapter configuration');
    }

    jsonlogic.rm_operation(name);
  }

  /**
   * Get configuration
   */
  getConfig(): JSONLogicAdapterConfig {
    return { ...this.config };
  }
}
