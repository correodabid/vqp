/**
 * JSONLogic Evaluation Adapter
 * Implements QueryEvaluationPort using optimized JSONLogic engine
 */

import { QueryEvaluationPort } from '../../domain/ports/secondary.js';

export interface JSONLogicAdapterConfig {
  allowCustomOperations?: boolean;
  securityMode?: 'strict' | 'permissive';
  enableCache?: boolean;
  maxCacheSize?: number;
}

/**
 * Optimized JSONLogic Implementation
 * Based on performance testing, this provides significant improvements over standard json-logic-js
 */
class OptimizedJSONLogic {
  private logicCache = new Map<string, any>();
  private varCache = new Map<string, any>();
  private pathCache = new Map<string, string[]>();
  private maxCacheSize: number;

  constructor(maxCacheSize = 1000) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Main evaluation function with optimizations
   */
  apply(logic: any, data: any = {}): any {
    if (logic === null || logic === undefined) return logic;
    if (typeof logic !== 'object') return logic;
    if (Array.isArray(logic)) return logic.map((item) => this.apply(item, data));

    // Cache key for repeated evaluations
    const cacheKey = JSON.stringify(logic);
    if (this.logicCache.has(cacheKey)) {
      const cachedLogic = this.logicCache.get(cacheKey);
      return this.evaluateWithData(cachedLogic, data);
    }

    // Cache management
    if (this.logicCache.size >= this.maxCacheSize) {
      const firstKey = this.logicCache.keys().next().value;
      if (firstKey !== undefined) {
        this.logicCache.delete(firstKey);
      }
    }

    this.logicCache.set(cacheKey, logic);
    return this.evaluateWithData(logic, data);
  }

  private evaluateWithData(logic: any, data: any): any {
    const keys = Object.keys(logic);
    if (keys.length === 0) return logic;

    const operator = keys[0];
    if (!operator) return logic;

    const args = logic[operator];

    switch (operator) {
      case 'var':
        return this.getVariable(args, data);

      case '==':
        return this.strictEqual(args, data);

      case '!=':
        return !this.strictEqual(args, data);

      case '>':
        return this.compare(args, data, (a, b) => a > b);

      case '>=':
        return this.compare(args, data, (a, b) => a >= b);

      case '<':
        return this.compare(args, data, (a, b) => a < b);

      case '<=':
        return this.compare(args, data, (a, b) => a <= b);

      case 'and':
        return this.evaluateAnd(args, data);

      case 'or':
        return this.evaluateOr(args, data);

      case 'not':
        return !this.isTruthy(this.apply(args, data));

      case '+':
        return this.arithmetic(args, data, (a, b) => a + b);

      case '-':
        return this.arithmetic(args, data, (a, b) => a - b);

      case '*':
        return this.arithmetic(args, data, (a, b) => a * b);

      case '/':
        return this.divide(args, data);

      case 'in':
        return this.evaluateIn(args, data);

      case 'if':
        return this.evaluateIf(args, data);

      case 'filter':
        return this.evaluateFilter(args, data);

      case 'map':
        return this.evaluateMap(args, data);

      case 'reduce':
        return this.evaluateReduce(args, data);

      case 'some':
        return this.evaluateSome(args, data);

      case 'all':
        return this.evaluateAll(args, data);

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  private getVariable(path: string | string[], data: any): any {
    if (path === null || path === undefined || path === '') return data;

    const pathStr = Array.isArray(path) ? path.join('.') : String(path);

    // Ultra-fast path for simple property access
    if (!pathStr.includes('.')) {
      return data[pathStr];
    }

    // Check variable cache
    const cacheKey = `${pathStr}:${typeof data}`;
    if (this.varCache.has(cacheKey)) {
      const cachedResult = this.varCache.get(cacheKey);
      return this.extractFromCachedPath(data, cachedResult.path);
    }

    // Parse and cache path
    let pathSegments: string[];
    if (this.pathCache.has(pathStr)) {
      pathSegments = this.pathCache.get(pathStr)!;
    } else {
      pathSegments = pathStr.split('.');
      if (this.pathCache.size >= this.maxCacheSize) {
        const firstKey = this.pathCache.keys().next().value;
        if (firstKey !== undefined) {
          this.pathCache.delete(firstKey);
        }
      }
      this.pathCache.set(pathStr, pathSegments);
    }

    // Navigate path
    let current = data;
    for (const segment of pathSegments) {
      if (current === null || current === undefined) return null;
      current = current[segment];
    }

    // Cache result
    if (this.varCache.size >= this.maxCacheSize) {
      const firstKey = this.varCache.keys().next().value;
      if (firstKey !== undefined) {
        this.varCache.delete(firstKey);
      }
    }
    this.varCache.set(cacheKey, { path: pathSegments, value: current });

    return current;
  }

  private extractFromCachedPath(data: any, pathSegments: string[]): any {
    let current = data;
    for (const segment of pathSegments) {
      if (current === null || current === undefined) return null;
      current = current[segment];
    }
    return current;
  }

  private strictEqual(args: any[], data: any): boolean {
    if (args.length !== 2) throw new Error('== requires exactly 2 arguments');

    const left = this.apply(args[0], data);
    const right = this.apply(args[1], data);

    // Fast path for common types
    if (typeof left === typeof right) {
      return left === right;
    }

    // Type coercion for numbers and strings
    if (
      (typeof left === 'number' && typeof right === 'string') ||
      (typeof left === 'string' && typeof right === 'number')
    ) {
      return Number(left) === Number(right);
    }

    return left == right; // Intentional == for type coercion
  }

  private compare(args: any[], data: any, compareFn: (a: any, b: any) => boolean): boolean {
    if (args.length !== 2) throw new Error('Comparison requires exactly 2 arguments');

    const left = this.apply(args[0], data);
    const right = this.apply(args[1], data);

    if (left === null || left === undefined || right === null || right === undefined) {
      return false;
    }

    return compareFn(Number(left), Number(right));
  }

  private evaluateAnd(args: any[], data: any): boolean {
    for (const arg of args) {
      if (!this.isTruthy(this.apply(arg, data))) {
        return false;
      }
    }
    return true;
  }

  private evaluateOr(args: any[], data: any): boolean {
    for (const arg of args) {
      if (this.isTruthy(this.apply(arg, data))) {
        return true;
      }
    }
    return false;
  }

  private arithmetic(args: any[], data: any, operation: (a: number, b: number) => number): number {
    if (args.length < 2) throw new Error('Arithmetic operations require at least 2 arguments');

    let result = Number(this.apply(args[0], data));
    for (let i = 1; i < args.length; i++) {
      result = operation(result, Number(this.apply(args[i], data)));
    }
    return result;
  }

  private divide(args: any[], data: any): number {
    if (args.length !== 2) throw new Error('Division requires exactly 2 arguments');

    const left = Number(this.apply(args[0], data));
    const right = Number(this.apply(args[1], data));

    if (right === 0) {
      throw new Error('Division by zero');
    }

    return left / right;
  }

  private evaluateIn(args: any[], data: any): boolean {
    if (args.length !== 2) throw new Error('in requires exactly 2 arguments');

    const needle = this.apply(args[0], data);
    const haystack = this.apply(args[1], data);

    if (!Array.isArray(haystack)) return false;

    // Optimized search for small arrays
    if (haystack.length < 50) {
      return haystack.includes(needle);
    }

    // Use Set for larger arrays
    const haystackSet = new Set(haystack);
    return haystackSet.has(needle);
  }

  private evaluateIf(args: any[], data: any): any {
    if (args.length < 2) throw new Error('if requires at least 2 arguments');

    for (let i = 0; i < args.length - 1; i += 2) {
      if (this.isTruthy(this.apply(args[i], data))) {
        return this.apply(args[i + 1], data);
      }
    }

    // Default case (else)
    if (args.length % 2 === 1) {
      return this.apply(args[args.length - 1], data);
    }

    return null;
  }

  private evaluateFilter(args: any[], data: any): any[] {
    if (args.length !== 2) throw new Error('filter requires exactly 2 arguments');

    const array = this.apply(args[0], data);
    if (!Array.isArray(array)) return [];

    const condition = args[1];
    return array.filter((item) => this.isTruthy(this.apply(condition, item)));
  }

  private evaluateMap(args: any[], data: any): any[] {
    if (args.length !== 2) throw new Error('map requires exactly 2 arguments');

    const array = this.apply(args[0], data);
    if (!Array.isArray(array)) return [];

    const transform = args[1];
    return array.map((item) => this.apply(transform, item));
  }

  private evaluateReduce(args: any[], data: any): any {
    if (args.length < 2 || args.length > 3) throw new Error('reduce requires 2 or 3 arguments');

    const array = this.apply(args[0], data);
    if (!Array.isArray(array)) return null;

    const operation = args[1];
    let accumulator =
      args.length === 3 ? this.apply(args[2], data) : array.length > 0 ? array[0] : null;

    const startIndex = args.length === 3 ? 0 : 1;
    for (let i = startIndex; i < array.length; i++) {
      const reduceData = {
        current: array[i],
        accumulator: accumulator,
        index: i,
      };
      accumulator = this.apply(operation, reduceData);
    }

    return accumulator;
  }

  private evaluateSome(args: any[], data: any): boolean {
    if (args.length !== 2) throw new Error('some requires exactly 2 arguments');

    const array = this.apply(args[0], data);
    if (!Array.isArray(array)) return false;

    const condition = args[1];
    return array.some((item) => this.isTruthy(this.apply(condition, item)));
  }

  private evaluateAll(args: any[], data: any): boolean {
    if (args.length !== 2) throw new Error('all requires exactly 2 arguments');

    const array = this.apply(args[0], data);
    if (!Array.isArray(array)) return true; // Empty array returns true

    const condition = args[1];
    return array.every((item) => this.isTruthy(this.apply(condition, item)));
  }

  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  /**
   * Extract variables used in an expression
   */
  uses_data(logic: any): string[] {
    const variables = new Set<string>();

    const extractVars = (obj: any): void => {
      if (obj === null || obj === undefined) return;

      if (Array.isArray(obj)) {
        obj.forEach(extractVars);
        return;
      }

      if (typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'var' && typeof value === 'string') {
            variables.add(value);
          } else {
            extractVars(value);
          }
        }
      }
    };

    extractVars(logic);
    return Array.from(variables);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      logicCache: this.logicCache.size,
      varCache: this.varCache.size,
      pathCache: this.pathCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.logicCache.clear();
    this.varCache.clear();
    this.pathCache.clear();
  }
}

/**
 * JSONLogic adapter for query evaluation
 * This adapter provides safe evaluation of JSONLogic expressions using optimized engine
 */
export class JSONLogicAdapter implements QueryEvaluationPort {
  private config: JSONLogicAdapterConfig;
  private dangerousOperations = ['eval', 'function', 'constructor', '__proto__', 'prototype'];
  private optimizedLogic: OptimizedJSONLogic;

  constructor(config: JSONLogicAdapterConfig = {}) {
    this.config = {
      allowCustomOperations: false,
      securityMode: 'strict',
      enableCache: true,
      maxCacheSize: 1000,
      ...config,
    };

    this.optimizedLogic = new OptimizedJSONLogic(this.config.maxCacheSize || 1000);
  }

  /**
   * Evaluate JSONLogic expression against data
   */
  async evaluate(expression: any, data: any = {}): Promise<any> {
    try {
      // Validate expression first
      if (!(await this.isValidExpression(expression))) {
        throw new Error('Invalid JSONLogic expression');
      }

      // Sanitize in strict mode
      if (this.config.securityMode === 'strict') {
        expression = await this.sanitizeExpression(expression);
      }

      // Evaluate using optimized engine
      const result = this.optimizedLogic.apply(expression, data);
      return result;
    } catch (error) {
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
      if (typeof expression !== 'object' || expression === null) {
        return false;
      }

      // Try to apply with empty data to check for syntax errors
      this.optimizedLogic.apply(expression, {});
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract variables used in expression
   */
  async extractVariables(expression: any): Promise<string[]> {
    try {
      const variables = this.optimizedLogic.uses_data(expression);
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
   * Get configuration
   */
  getConfig(): JSONLogicAdapterConfig {
    return { ...this.config };
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats() {
    return this.optimizedLogic.getCacheStats();
  }

  /**
   * Clear caches (for memory management)
   */
  clearCache(): void {
    this.optimizedLogic.clearCache();
  }
}
