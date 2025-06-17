/**
 * VQP Response Modes Example
 *
 * This example demonstrates the four response modes available in VQP v1.1:
 * - Strict: Only boolean results (backward compatible)
 * - Consensual: Actual values with user consent
 * - Reciprocal: Mutual verification between parties
 * - Obfuscated: Privacy-preserving value disclosure
 */

import {
  VQPService,
  QueryBuilder,
  VQPVerifier,
  createResponseModeAdapter,
  ResponseModeAdapterConfig,
  VQPQuery,
  VQPResponse,
} from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { HTTPVocabularyAdapter } from '@vqp/vocab-http';

// Standard vocabularies for testing
const IDENTITY_VOCAB = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Identity Vocabulary',
  type: 'object',
  properties: {
    age: { type: 'integer', minimum: 0, maximum: 150 },
    citizenship: { type: 'string', pattern: '^[A-Z]{2}$' },
    has_drivers_license: { type: 'boolean' },
    annual_income: { type: 'integer', minimum: 0 },
  },
};

const HEALTH_VOCAB = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Health Vocabulary',
  type: 'object',
  properties: {
    vaccinations_completed: { type: 'array', items: { type: 'string' } },
    covid_vaccination_doses: { type: 'integer', minimum: 0 },
    blood_type: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  },
};

const METRICS_VOCAB = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Metrics Vocabulary',
  type: 'object',
  properties: {
    uptime_percentage_24h: { type: 'number', minimum: 0, maximum: 100 },
    processed_events_last_hour: { type: 'integer', minimum: 0 },
    error_rate_percentage: { type: 'number', minimum: 0, maximum: 100 },
    health_status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
  },
};

// Sample data vault for demonstration
const sampleVault = {
  personal: {
    age: 28,
    citizenship: 'US',
    has_drivers_license: true,
    annual_income: 75000,
  },
  health: {
    vaccinations_completed: ['COVID-19', 'influenza'],
    covid_vaccination_doses: 3,
    blood_type: 'O+',
  },
  metrics: {
    daily_active_users: 1250,
    uptime_percentage_24h: 99.8,
    response_time_p95_ms: 150,
  },
};

async function demonstrateResponseModes() {
  console.log('🎛️ VQP Response Modes Demonstration\n');

  // Set up VQP service with response mode support
  const responseMode = createResponseModeAdapter({
    autoConsent: true, // For demo - automatically grant consent
    defaultMode: 'strict',
    defaultPrecision: 10,
    defaultNoiseLevel: 0.1,
  });

  const vqpService = new VQPService(
    createFileSystemDataAdapter({ vaultPath: './examples/sample-vault.json' }),
    createSoftwareCryptoAdapter(), // Use default config
    await createConsoleAuditAdapter(), // Await the async factory
    await createJSONLogicAdapter(),
    responseMode
  );

  const verifier = new VQPVerifier(createSoftwareCryptoAdapter());

  // Example 1: Strict Mode (Default)
  console.log('📊 Example 1: Strict Mode (Default)');
  const strictQuery = new QueryBuilder()
    .requester('did:web:strict-service.com')
    .vocabulary('vqp:identity:v1')
    .strict() // Explicit strict mode
    .expression({ '>=': [{ var: 'age' }, 18] })
    .build();

  const strictResponse = await vqpService.processQuery(strictQuery, IDENTITY_VOCAB);
  console.log('Query:', JSON.stringify(strictQuery.responseMode, null, 2));
  console.log(
    'Response:',
    JSON.stringify(
      {
        mode: strictResponse.mode,
        result: strictResponse.result,
        value: strictResponse.value, // Should be undefined in strict mode
      },
      null,
      2
    )
  );
  console.log('✅ Verification:', await verifier.verifyComplete(strictResponse, strictQuery.id));
  console.log();

  // Example 2: Consensual Mode
  console.log('🤝 Example 2: Consensual Mode');
  const consensualQuery = new QueryBuilder()
    .requester('did:web:research-institute.org')
    .vocabulary('vqp:identity:v1')
    .consensual('COVID-19 vaccine effectiveness research study')
    .expression({ '>=': [{ var: 'age' }, 25] })
    .build();

  const consensualResponse = await vqpService.processQuery(consensualQuery, IDENTITY_VOCAB);
  console.log('Query:', JSON.stringify(consensualQuery.responseMode, null, 2));
  console.log(
    'Response:',
    JSON.stringify(
      {
        mode: consensualResponse.mode,
        result: consensualResponse.result,
        value: consensualResponse.value, // Should contain actual age
        consentProof: consensualResponse.consentProof?.granted,
      },
      null,
      2
    )
  );
  console.log(
    '✅ Verification:',
    await verifier.verifyComplete(consensualResponse, consensualQuery.id)
  );
  console.log();

  // Example 3: Reciprocal Mode
  console.log('🔄 Example 3: Reciprocal Mode');

  // First, create a mock requester proof
  const requesterProof = {
    type: 'signature',
    algorithm: 'ed25519',
    signature: 'mock-signature-for-demo',
    publicKey: 'mock-public-key',
  };

  const reciprocalQuery = new QueryBuilder()
    .requester('did:web:p2p-platform.com')
    .vocabulary('vqp:identity:v1')
    .reciprocal(requesterProof, ['income_verified', 'employment_status'])
    .expression({ '>=': [{ var: 'annual_income' }, 60000] })
    .build();

  const reciprocalResponse = await vqpService.processQuery(reciprocalQuery, IDENTITY_VOCAB);
  console.log('Query:', JSON.stringify(reciprocalQuery.responseMode, null, 2));
  console.log(
    'Response:',
    JSON.stringify(
      {
        mode: reciprocalResponse.mode,
        result: reciprocalResponse.result,
        value: reciprocalResponse.value, // Should contain actual income
        mutualProof: reciprocalResponse.mutualProof?.requesterVerified,
      },
      null,
      2
    )
  );
  console.log(
    '✅ Verification:',
    await verifier.verifyComplete(reciprocalResponse, reciprocalQuery.id)
  );
  console.log();

  // Example 4: Obfuscated Mode - Range
  console.log('🎭 Example 4a: Obfuscated Mode - Range');
  const obfuscatedRangeQuery = new QueryBuilder()
    .requester('did:web:analytics-service.com')
    .vocabulary('vqp:metrics:v1')
    .obfuscated('range', { precision: 100 })
    .expression({ var: 'processed_events_last_hour' }) // Query actual value that exists
    .build();

  const obfuscatedRangeResponse = await vqpService.processQuery(
    obfuscatedRangeQuery,
    METRICS_VOCAB
  );
  console.log('Query:', JSON.stringify(obfuscatedRangeQuery.responseMode, null, 2));
  console.log(
    'Response:',
    JSON.stringify(
      {
        mode: obfuscatedRangeResponse.mode,
        result: obfuscatedRangeResponse.result,
        value: obfuscatedRangeResponse.value, // Should be a range like "1200-1300"
        obfuscation: obfuscatedRangeResponse.obfuscationApplied?.method,
      },
      null,
      2
    )
  );
  console.log(
    '✅ Verification:',
    await verifier.verifyComplete(obfuscatedRangeResponse, obfuscatedRangeQuery.id)
  );
  console.log();

  // Example 5: Obfuscated Mode - Noise
  console.log('🎭 Example 4b: Obfuscated Mode - Noise');
  const obfuscatedNoiseQuery = new QueryBuilder()
    .requester('did:web:competitor-analysis.com')
    .vocabulary('vqp:metrics:v1')
    .obfuscated('noise', { noiseLevel: 0.15 })
    .expression({ var: 'uptime_percentage_24h' }) // Query actual value that exists
    .build();

  const obfuscatedNoiseResponse = await vqpService.processQuery(
    obfuscatedNoiseQuery,
    METRICS_VOCAB
  );
  console.log('Query:', JSON.stringify(obfuscatedNoiseQuery.responseMode, null, 2));
  console.log(
    'Response:',
    JSON.stringify(
      {
        mode: obfuscatedNoiseResponse.mode,
        result: obfuscatedNoiseResponse.result,
        value: obfuscatedNoiseResponse.value, // Should be actual value + noise
        obfuscation: obfuscatedNoiseResponse.obfuscationApplied?.method,
        noiseLevel: obfuscatedNoiseResponse.obfuscationApplied?.noiseLevel,
      },
      null,
      2
    )
  );
  console.log(
    '✅ Verification:',
    await verifier.verifyComplete(obfuscatedNoiseResponse, obfuscatedNoiseQuery.id)
  );
  console.log();

  // Example 6: Healthcare Scenario - Consensual with Justification
  console.log('🏥 Example 5: Healthcare Research - Consensual Mode');
  const healthQuery = new QueryBuilder()
    .requester('did:web:medical-research.edu')
    .vocabulary('vqp:health:v1')
    .consensual('Clinical trial for COVID-19 booster effectiveness in vaccinated individuals')
    .expression({
      and: [
        { in: ['COVID-19', { var: 'vaccinations_completed' }] },
        { '>=': [{ var: 'covid_vaccination_doses' }, 2] },
      ],
    })
    .build();

  const healthResponse = await vqpService.processQuery(healthQuery, HEALTH_VOCAB);
  console.log('Query justification:', healthQuery.responseMode?.config?.justification);
  console.log(
    'Response:',
    JSON.stringify(
      {
        mode: healthResponse.mode,
        result: healthResponse.result,
        value: healthResponse.value, // Should show vaccination details
        consentGranted: healthResponse.consentProof?.granted,
      },
      null,
      2
    )
  );
  console.log('✅ Verification:', await verifier.verifyComplete(healthResponse, healthQuery.id));
  console.log();

  console.log('✨ Response Modes demonstration completed!');
  console.log('\n📋 Summary of Response Modes:');
  console.log('• Strict: Maximum privacy, only boolean results');
  console.log('• Consensual: User controls value disclosure');
  console.log('• Reciprocal: Mutual verification between parties');
  console.log('• Obfuscated: Privacy-preserving value sharing');
}

// Error handling for missing consent
async function demonstrateConsentDenial() {
  console.log('\n❌ Demonstrating Consent Denial');

  const responseMode = createResponseModeAdapter({
    autoConsent: false, // Disable auto-consent
  });

  const vqpService = new VQPService(
    createFileSystemDataAdapter(sampleVault),
    createSoftwareCryptoAdapter('./examples/keys/'),
    await createConsoleAuditAdapter(), // Await the async factory
    createJSONLogicAdapter(),
    responseMode
  );

  const deniedQuery = new QueryBuilder()
    .requester('did:web:untrusted-service.com')
    .vocabulary('vqp:identity:v1')
    .consensual('Undisclosed commercial use')
    .expression({ '>=': [{ var: 'age' }, 18] })
    .build();

  try {
    await vqpService.processQuery(deniedQuery, IDENTITY_VOCAB);
  } catch (error) {
    console.log('Expected error:', error.code, '-', error.message);
  }
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateResponseModes().catch(console.error);
}

export { demonstrateResponseModes, demonstrateConsentDenial };
