/**
 * VQP Protocol Extensibility Demo
 * 
 * This example demonstrates how VQP is designed as an extensible protocol
 * that can be adapted for any domain without modifying the core implementation.
 */

import { QueryBuilder, VQPQuery } from '../lib/index.js';

// ============================================================================
// 1. PROTOCOL BASICS - Core building blocks work for any domain
// ============================================================================

const requester = 'did:web:example.com';

console.log('🔧 VQP Protocol Extensibility Demo');
console.log('=====================================\n');

// Basic comparison - works with any vocabulary and field
const basicQuery = QueryBuilder.compare(
  requester,
  'any-domain:any-vocab:v1',
  'any_field',
  '>=',
  'any_value'
);

console.log('✅ Basic comparison query structure:');
console.log(JSON.stringify(basicQuery, null, 2));
console.log();

// ============================================================================
// 2. STANDARD VOCABULARIES - Optional, not mandatory
// ============================================================================

console.log('📚 Standard Vocabularies (Optional)');
console.log('-----------------------------------');

// Identity verification
const identityQuery = QueryBuilder.and(
  requester,
  'vqp:identity:v1',
  [
    { '>=': [{ var: 'age' }, 21] },
    { '==': [{ var: 'citizenship' }, 'US'] }
  ]
);

// Financial verification
const financialQuery = QueryBuilder.and(
  requester,
  'vqp:financial:v1',
  [
    { '>=': [{ var: 'annual_income' }, 50000] },
    { '==': [{ var: 'employment_status' }, 'employed'] }
  ]
);

// IoT device query
const iotQuery = QueryBuilder.and(
  requester,
  'vqp:iot:v1',
  [
    { '>=': [{ var: 'battery_percentage' }, 20] },
    { '==': [{ var: 'security_enabled' }, true] }
  ]
);

console.log('Standard vocabularies work seamlessly with generic QueryBuilder ✅\n');

// ============================================================================
// 3. CUSTOM DOMAINS - The real power of VQP
// ============================================================================

console.log('🚀 Custom Domain Examples');
console.log('-------------------------');

// Gaming industry
const gamingQuery = QueryBuilder.and(
  requester,
  'gaming-corp:player:v1',
  [
    { '>=': [{ var: 'account_level' }, 50] },
    { '>=': [{ var: 'hours_played' }, 100] },
    { '<=': [{ var: 'toxicity_score' }, 0.1] },
    { '==': [{ var: 'verified_email' }, true] }
  ]
);

// Real estate
const realEstateQuery = QueryBuilder.and(
  requester,
  'realty-platform:property:v1',
  [
    { '>=': [{ var: 'property_value' }, 500000] },
    { '==': [{ var: 'zoning_type' }, 'residential'] },
    { '<=': [{ var: 'days_on_market' }, 30] },
    { '==': [{ var: 'inspection_passed' }, true] }
  ]
);

// Scientific research
const researchQuery = QueryBuilder.and(
  requester,
  'research-institute:dataset:v1',
  [
    { '>=': [{ var: 'sample_size' }, 1000] },
    { '==': [{ var: 'ethics_approved' }, true] },
    { '<=': [{ var: 'data_collection_year' }, 2025] },
    { in: ['peer_reviewed', { var: 'publication_status' }] }
  ]
);

// Automotive industry
const automotiveQuery = QueryBuilder.and(
  requester,
  'auto-manufacturer:vehicle:v1',
  [
    { '<=': [{ var: 'emissions_co2_g_km' }, 120] },
    { '>=': [{ var: 'safety_rating_stars' }, 4] },
    { '==': [{ var: 'autonomous_level' }, 'L3'] },
    { '>=': [{ var: 'battery_range_km' }, 400] }
  ]
);

console.log('✅ Gaming query created');
console.log('✅ Real estate query created');
console.log('✅ Research query created');
console.log('✅ Automotive query created\n');

// ============================================================================
// 4. COMPLEX EXPRESSIONS - Full JSONLogic power available
// ============================================================================

console.log('🧠 Complex JSONLogic Expressions');
console.log('--------------------------------');

// Conditional logic with nested expressions
const complexConditionalQuery = QueryBuilder.fromExpression(
  requester,
  'finance:risk-assessment:v2',
  {
    if: [
      { '>=': [{ var: 'credit_score' }, 750] },
      // If credit score >= 750, check income only
      { '>=': [{ var: 'annual_income' }, 60000] },
      // Else, check both income and employment history
      {
        and: [
          { '>=': [{ var: 'annual_income' }, 80000] },
          { '>=': [{ var: 'employment_duration_months' }, 24] },
          { '<=': [{ var: 'debt_to_income_ratio' }, 0.3] }
        ]
      }
    ]
  }
);

// Array operations and transformations
const arrayOperationsQuery = QueryBuilder.fromExpression(
  requester,
  'education:student:v1',
  {
    and: [
      // Check if any grade is above 90
      { some: [{ var: 'grades' }, { '>=': [{ var: '' }, 90] }] },
      // Check if average grade is above 85
      { '>=': [{ '/': [{ reduce: [{ var: 'grades' }, { '+': [{ var: 'current' }, { var: 'accumulator' }] }, 0] }, { var: 'grades.length' }] }, 85] },
      // Check attendance
      { '>=': [{ var: 'attendance_percentage' }, 95] }
    ]
  }
);

console.log('✅ Complex conditional query created');
console.log('✅ Array operations query created\n');

// ============================================================================
// 5. MULTI-VOCABULARY QUERIES - Cross-domain verification
// ============================================================================

console.log('🌐 Multi-Vocabulary Scenarios');
console.log('-----------------------------');

// Example: A comprehensive verification might need multiple queries
const comprehensiveVerification = {
  identityCheck: QueryBuilder.compare(requester, 'vqp:identity:v1', 'age', '>=', 18),
  financialCheck: QueryBuilder.compare(requester, 'vqp:financial:v1', 'annual_income', '>=', 40000),
  complianceCheck: QueryBuilder.in(requester, 'vqp:compliance:v1', 'KYC', 'certifications_active'),
  customBusinessCheck: QueryBuilder.fromExpression(
    requester,
    'acme-corp:employee:v1',
    {
      and: [
        { '>=': [{ var: 'years_experience' }, 2] },
        { '==': [{ var: 'security_clearance' }, 'confidential'] }
      ]
    }
  )
};

console.log('✅ Multi-vocabulary verification scenario created\n');

// ============================================================================
// 6. EXTENSIBILITY PATTERNS - How to extend without core changes
// ============================================================================

console.log('🔧 Extensibility Patterns');
console.log('-------------------------');

// Pattern 1: Domain-specific helper classes (like we created before)
class BlockchainQueries {
  static walletVerification(requester: string, minBalance: number, target?: string): VQPQuery {
    return QueryBuilder.and(
      requester,
      'blockchain:wallet:v1',
      [
        { '>=': [{ var: 'balance_eth' }, minBalance] },
        { '==': [{ var: 'kyc_verified' }, true] },
        { '<=': [{ var: 'days_since_last_transaction' }, 30] }
      ],
      target
    );
  }

  static nftOwnership(requester: string, collection: string, target?: string): VQPQuery {
    return QueryBuilder.in(
      requester,
      'blockchain:nft:v1',
      collection,
      'owned_collections',
      target
    );
  }
}

// Pattern 2: Configuration-driven query builders
const queryTemplates = {
  ageVerification: (minAge: number) => ({
    vocab: 'vqp:identity:v1',
    expr: { '>=': [{ var: 'age' }, minAge] }
  }),
  
  incomeVerification: (minIncome: number) => ({
    vocab: 'vqp:financial:v1',
    expr: { '>=': [{ var: 'annual_income' }, minIncome] }
  }),

  customThreshold: (field: string, operator: string, value: any, vocab: string) => ({
    vocab,
    expr: { [operator]: [{ var: field }, value] }
  })
};

function buildFromTemplate(requester: string, templateName: string, ...params: any[]): VQPQuery {
  const template = queryTemplates[templateName as keyof typeof queryTemplates];
  if (!template) {
    throw new Error(`Unknown template: ${templateName}`);
  }
  
  const config = (template as any)(...params);
  return QueryBuilder.fromExpression(requester, config.vocab, config.expr);
}

// Pattern 3: Plugin architecture for new domains
interface DomainPlugin {
  vocabularyUri: string;
  createQuery(requester: string, queryType: string, params: any): VQPQuery;
}

class HealthcareDomain implements DomainPlugin {
  vocabularyUri = 'healthcare:patient:v1';
  
  createQuery(requester: string, queryType: string, params: any): VQPQuery {
    switch (queryType) {
      case 'prescription_eligibility':
        return QueryBuilder.and(requester, this.vocabularyUri, [
          { '==': [{ var: 'insurance_active' }, true] },
          { '!': [{ in: [params.medication, { var: 'allergies' }] }] }
        ]);
      
      case 'clinical_trial_eligibility':
        return QueryBuilder.and(requester, this.vocabularyUri, [
          { '>=': [{ var: 'age' }, params.minAge] },
          { '<=': [{ var: 'age' }, params.maxAge] },
          { '!': [{ var: 'pregnant' }] }
        ]);
        
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }
}

const healthPlugin = new HealthcareDomain();
const prescriptionQuery = healthPlugin.createQuery(requester, 'prescription_eligibility', {
  medication: 'aspirin'
});

console.log('✅ Blockchain queries helper created');
console.log('✅ Template-based query builder created');
console.log('✅ Plugin architecture example created\n');

// ============================================================================
// 7. FUTURE-PROOFING - Ready for new technologies
// ============================================================================

console.log('🚀 Future-Proofing Examples');
console.log('---------------------------');

// Quantum-resistant queries (future)
const quantumResistantQuery = QueryBuilder.fromExpression(
  requester,
  'quantum:security:v1',
  {
    and: [
      { '==': [{ var: 'post_quantum_signature' }, true] },
      { '>=': [{ var: 'entropy_bits' }, 256] }
    ]
  }
);

// AI/ML model verification
const mlModelQuery = QueryBuilder.and(
  requester,
  'ai:model:v1',
  [
    { '>=': [{ var: 'accuracy_percentage' }, 95] },
    { '<=': [{ var: 'bias_score' }, 0.1] },
    { '==': [{ var: 'privacy_preserving' }, true] }
  ]
);

// Metaverse/VR identity
const metaverseQuery = QueryBuilder.and(
  requester,
  'metaverse:avatar:v1',
  [
    { '==': [{ var: 'identity_verified' }, true] },
    { '>=': [{ var: 'reputation_score' }, 0.8] },
    { '<=': [{ var: 'reports_count' }, 0] }
  ]
);

console.log('✅ Quantum-resistant query pattern ready');
console.log('✅ AI/ML verification query ready');
console.log('✅ Metaverse identity query ready\n');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('🎯 Protocol Extensibility Summary');
console.log('==================================');
console.log('✅ Core QueryBuilder works with ANY vocabulary');
console.log('✅ Standard vocabularies are optional, not mandatory');
console.log('✅ Custom domains can be created without core changes');
console.log('✅ Full JSONLogic expressiveness available');
console.log('✅ Multiple extension patterns supported');
console.log('✅ Future technologies can be integrated seamlessly');
console.log();
console.log('🔑 Key Principle: VQP is a PROTOCOL, not a rigid framework');
console.log('   → Define your own vocabularies');
console.log('   → Create your own query patterns');
console.log('   → Extend with your own helper functions');
console.log('   → The protocol adapts to YOUR needs');
console.log();
console.log('🚀 The future is extensible, private, and verifiable!');

// Export for other examples to use
export {
  BlockchainQueries,
  queryTemplates,
  buildFromTemplate,
  HealthcareDomain,
  comprehensiveVerification
};
