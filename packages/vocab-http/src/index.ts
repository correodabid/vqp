export { HTTPVocabularyAdapter } from './http-adapter.js';
export type { HTTPVocabularyConfig } from './http-adapter.js';

/**
 * Factory function to create an HTTP vocabulary resolver
 *
 * NOTE: Vocabulary resolution is optional in the new VQP architecture.
 * Consider passing vocabularies directly to VQPService.processQuery()
 * for simpler application architecture.
 */
export async function createHTTPVocabularyResolver(
  config: import('./http-adapter.js').HTTPVocabularyConfig = {}
) {
  const { HTTPVocabularyAdapter } = await import('./http-adapter.js');
  return new HTTPVocabularyAdapter(config);
}

/**
 * Standard VQP vocabularies for direct use
 */
export const STANDARD_VOCABULARIES = {
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
} as const;
