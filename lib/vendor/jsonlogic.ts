/**
 * TypeScript wrapper for vendored jsonlogic-js
 * This provides type safety for the JSONLogic library
 */

// For now, we'll use a simple bundled version of jsonlogic
// This is a safe implementation for ES modules
let jsonlogic: any;

try {
  // Try to load from vendor directory first
  const { createRequire } = require('module');
  const req = createRequire(__filename);
  jsonlogic = req('../../vendor/jsonlogic-js/logic.js');
} catch (error) {
  // Fallback: provide a minimal implementation
  console.warn('JSONLogic vendor library not available, using minimal implementation');
  jsonlogic = {
    apply: (logic: any, data: any) => {
      // Very basic implementation for critical operators
      if (typeof logic !== 'object' || logic === null) {
        return logic;
      }

      const operator = Object.keys(logic)[0];
      const values = logic[operator as keyof typeof logic];

      switch (operator) {
        case 'var':
          return data[values] !== undefined ? data[values] : null;
        case '>=':
          return jsonlogic.apply(values[0], data) >= jsonlogic.apply(values[1], data);
        case '>':
          return jsonlogic.apply(values[0], data) > jsonlogic.apply(values[1], data);
        case '<=':
          return jsonlogic.apply(values[0], data) <= jsonlogic.apply(values[1], data);
        case '<':
          return jsonlogic.apply(values[0], data) < jsonlogic.apply(values[1], data);
        case '==':
          return jsonlogic.apply(values[0], data) === jsonlogic.apply(values[1], data);
        case '!=':
          return jsonlogic.apply(values[0], data) !== jsonlogic.apply(values[1], data);
        case 'and':
          return values.every((v: any) => jsonlogic.apply(v, data));
        case 'or':
          return values.some((v: any) => jsonlogic.apply(v, data));
        case 'not':
          return !jsonlogic.apply(values, data);
        case 'if':
          return jsonlogic.apply(values[0], data)
            ? jsonlogic.apply(values[1], data)
            : jsonlogic.apply(values[2], data);
        default:
          console.warn(`Unsupported JSONLogic operator: ${operator}`);
          return null;
      }
    },
    uses_data: () => true,
    add_operation: () => {},
    rm_operation: () => {},
  };
}

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
