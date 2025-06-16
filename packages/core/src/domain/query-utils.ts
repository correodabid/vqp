import { VQPQuery } from './types.js';

/**
 * Utility functions for VQP query handling
 *
 * These are pure functions that don't require state or transport layers
 */

/**
 * Validate query structure and content
 */
export function validateQuery(query: VQPQuery): void {
  if (!query.id) {
    throw new Error('Query must have an ID');
  }
  if (!query.version) {
    throw new Error('Query must have a version');
  }
  if (!query.timestamp) {
    throw new Error('Query must have a timestamp');
  }
  if (!query.query?.vocab) {
    throw new Error('Query must specify a vocabulary');
  }
  if (!query.query?.expr) {
    throw new Error('Query must have an expression');
  }
  if (!query.query?.lang) {
    throw new Error('Query must specify a language');
  }
}

/**
 * Add requester identity to a query if not already set
 */
export function setRequesterIdentity(query: VQPQuery, identity: string): VQPQuery {
  return {
    ...query,
    requester: query.requester || identity,
  };
}

/**
 * Prepare a query with proper metadata (validation + identity)
 */
export function prepareQuery(query: VQPQuery, requesterIdentity: string): VQPQuery {
  const preparedQuery = setRequesterIdentity(query, requesterIdentity);
  validateQuery(preparedQuery);
  return preparedQuery;
}
