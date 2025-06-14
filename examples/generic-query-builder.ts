/**
 * Generic Query Builder Examples
 * 
 * This example shows how to use the generic QueryBuilder to create
 * any type of query without being limited to predefined methods.
 * 
 * The protocol is extensible - anyone can define the queries they need!
 */

import { QueryBuilder } from '../lib/domain/query-builder.js';

// Generic builders for any vocabulary and conditions
const requester = 'did:web:my-service.com';

// Example 1: Age verification using generic compare method
const ageQuery = QueryBuilder.compare(
  requester,
  'vqp:identity:v1',
  'age',
  '>=',
  18
);

// Example 2: Income verification using generic compare method  
const incomeQuery = QueryBuilder.compare(
  requester,
  'vqp:financial:v1',
  'annual_income',
  '>=',
  50000
);

// Example 3: Multiple conditions using generic 'and' method
const employmentQuery = QueryBuilder.and(
  requester,
  'vqp:financial:v1',
  [
    { '==': [{ var: 'employment_status' }, 'employed'] },
    { '>=': [{ var: 'employment_duration_months' }, 12] },
    { '>=': [{ var: 'annual_income' }, 40000] }
  ]
);

// Example 4: Array membership using generic 'in' method
const certificationQuery = QueryBuilder.in(
  requester,
  'vqp:identity:v1',
  'AWS Solutions Architect',
  'certifications'
);

// Example 5: Complex custom query using fromExpression
const customHealthQuery = QueryBuilder.fromExpression(
  requester,
  'vqp:health:v1',
  {
    and: [
      { in: ['COVID-19', { var: 'vaccinations_completed' }] },
      { '>=': [{ var: 'covid_vaccination_doses' }, 2] },
      { '!': [{ var: 'pregnant' }] }
    ]
  }
);

// Example 6: Custom vocabulary with domain-specific fields
const customBusinessQuery = QueryBuilder.fromExpression(
  requester,
  'acme:business:v1',
  {
    and: [
      { '==': [{ var: 'company_size' }, 'enterprise'] },
      { '>=': [{ var: 'revenue_millions' }, 100] },
      { in: ['fintech', { var: 'industries' }] }
    ]
  }
);

// Example 7: IoT device query using generic methods
const iotQuery = QueryBuilder.and(
  requester,
  'vqp:iot:v1',
  [
    { '>=': [{ var: 'battery_percentage' }, 20] },
    { '<=': [{ var: 'last_seen_minutes' }, 60] },
    { '==': [{ var: 'security_enabled' }, true] }
  ]
);

// Example 8: Research eligibility using 'or' conditions
const researchQuery = QueryBuilder.or(
  requester,
  'vqp:academic:v1',
  [
    { in: ['masters', { var: 'degrees_earned' }] },
    { in: ['doctorate', { var: 'degrees_earned' }] },
    { '>=': [{ var: 'years_research_experience' }, 5] }
  ]
);

// Example 9: Using the fluent interface for complex queries
const fluentQuery = new QueryBuilder()
  .requester('did:web:example.com')
  .target('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')
  .vocabulary('vqp:compliance:v1')
  .expression({
    and: [
      { in: ['ISO-27001', { var: 'certifications_active' }] },
      { '>=': [{ var: 'audit_score' }, 85] },
      { '<=': [{ var: 'days_since_last_audit' }, 365] }
    ]
  })
  .build();

// Custom query for your specific domain
function createCustomQuery(requester: string, customField: string, operator: string, value: any): any {
  return QueryBuilder.fromExpression(
    requester,
    'my-company:custom:v1',
    {
      [operator]: [{ var: customField }, value]
    }
  );
}

console.log('All queries created successfully!');
console.log('Age query:', JSON.stringify(ageQuery, null, 2));
console.log('Custom business query:', JSON.stringify(customBusinessQuery, null, 2));
