/**
 * TypeScript wrapper for vendored jsonlogic-js
 * This provides type safety for the JSONLogic library
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the vendored JavaScript file
const jsonlogic = require('../../vendor/jsonlogic-js/logic.js');

export interface JSONLogicExpression {
  [operator: string]: any;
}

export interface JSONLogicData {
  [key: string]: any;
}

/**
 * Apply JSONLogic expression to data
 */
export function apply(expression: JSONLogicExpression, data?: JSONLogicData): any {
  return jsonlogic.apply(expression, data);
}

/**
 * Add custom operations to JSONLogic
 */
export function add_operation(name: string, operation: (...args: any[]) => any): void {
  jsonlogic.add_operation(name, operation);
}

/**
 * Remove custom operations from JSONLogic
 */
export function rm_operation(name: string): void {
  jsonlogic.rm_operation(name);
}

/**
 * Get all variables used in an expression
 */
export function uses_data(expression: JSONLogicExpression): string[] {
  return jsonlogic.uses_data(expression);
}

/**
 * Validate that an expression is valid JSONLogic
 */
export function isValid(expression: any): boolean {
  try {
    if (typeof expression !== 'object' || expression === null) {
      return false;
    }
    
    // Try to apply with empty data to check for syntax errors
    apply(expression, {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize JSONLogic expression for security
 * Removes potentially dangerous operations
 */
export function sanitize(expression: JSONLogicExpression): JSONLogicExpression {
  const dangerousOps = ['eval', 'function', 'constructor'];
  
  const sanitizeRecursive = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeRecursive);
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!dangerousOps.includes(key)) {
          sanitized[key] = sanitizeRecursive(value);
        }
      }
      return sanitized;
    }
    return obj;
  };
  
  return sanitizeRecursive(expression);
}

// Export the entire jsonlogic object for advanced usage
export { jsonlogic };

// Re-export common types
export type { JSONLogicExpression as Expression, JSONLogicData as Data };
