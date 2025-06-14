/**
 * Custom Query Extensions Example
 * 
 * This example shows how to extend the generic QueryBuilder
 * with your own domain-specific helper functions without
 * modifying the core protocol implementation.
 */

import { QueryBuilder, VQPQuery } from '../lib/index.js';

// Custom extensions for different domains
class IdentityQueries {
  static ageVerification(requester: string, minAge: number, target?: string): VQPQuery {
    return QueryBuilder.compare(requester, 'vqp:identity:v1', 'age', '>=', minAge, target);
  }

  static citizenshipCheck(requester: string, country: string, target?: string): VQPQuery {
    return QueryBuilder.compare(requester, 'vqp:identity:v1', 'citizenship', '==', country, target);
  }

  static credentialCheck(requester: string, credential: string, target?: string): VQPQuery {
    return QueryBuilder.in(requester, 'vqp:identity:v1', credential, 'certifications', target);
  }
}

class FinancialQueries {
  static incomeVerification(requester: string, minIncome: number, target?: string): VQPQuery {
    return QueryBuilder.compare(requester, 'vqp:financial:v1', 'annual_income', '>=', minIncome, target);
  }

  static employmentCheck(requester: string, target?: string): VQPQuery {
    return QueryBuilder.compare(requester, 'vqp:financial:v1', 'employment_status', '==', 'employed', target);
  }

  static loanEligibility(requester: string, minIncome: number, maxDebtRatio: number, minCreditScore: number, target?: string): VQPQuery {
    return QueryBuilder.and(
      requester,
      'vqp:financial:v1',
      [
        { '>=': [{ var: 'annual_income' }, minIncome] },
        { '<=': [{ var: 'debt_to_income_ratio' }, maxDebtRatio] },
        { '>=': [{ var: 'credit_score' }, minCreditScore] }
      ],
      target
    );
  }
}

class HealthQueries {
  static vaccinationStatus(requester: string, vaccine: string, minDoses: number, target?: string): VQPQuery {
    return QueryBuilder.and(
      requester,
      'vqp:health:v1',
      [
        { in: [vaccine, { var: 'vaccinations_completed' }] },
        { '>=': [{ var: `${vaccine.toLowerCase().replace('-', '_')}_vaccination_doses` }, minDoses] }
      ],
      target
    );
  }

  static clinicalTrialEligibility(requester: string, target?: string): VQPQuery {
    return QueryBuilder.and(
      requester,
      'vqp:health:v1',
      [
        { '!': [{ var: 'pregnant' }] },
        { '!': [{ var: 'recent_surgery_90_days' }] },
        { '==': [{ var: 'insurance_verified' }, true] }
      ],
      target
    );
  }
}

class SystemQueries {
  static healthCheck(requester: string, target?: string): VQPQuery {
    return QueryBuilder.and(
      requester,
      'vqp:metrics:v1',
      [
        { '>=': [{ var: 'uptime_percentage_24h' }, 99.0] },
        { '<=': [{ var: 'response_time_p95_ms' }, 500] },
        { '==': [{ var: 'health_status' }, 'healthy'] }
      ],
      target
    );
  }

  static slaCompliance(requester: string, minUptime: number, maxResponseTime: number, maxErrorRate: number, target?: string): VQPQuery {
    return QueryBuilder.and(
      requester,
      'vqp:metrics:v1',
      [
        { '>=': [{ var: 'uptime_percentage_24h' }, minUptime] },
        { '<=': [{ var: 'response_time_p95_ms' }, maxResponseTime] },
        { '<=': [{ var: 'error_rate_percentage' }, maxErrorRate] }
      ],
      target
    );
  }
}

// Custom domain-specific extensions
class AcmeCorpQueries {
  static employeeLevel(requester: string, minLevel: string, target?: string): VQPQuery {
    const levelMap = { junior: 1, mid: 2, senior: 3, principal: 4, staff: 5 };
    return QueryBuilder.compare(
      requester,
      'acme:employee:v1',
      'level_numeric',
      '>=',
      levelMap[minLevel as keyof typeof levelMap],
      target
    );
  }

  static securityClearance(requester: string, requiredLevel: string, target?: string): VQPQuery {
    return QueryBuilder.compare(
      requester,
      'acme:security:v1',
      'clearance_level',
      '==',
      requiredLevel,
      target
    );
  }
}

// Factory pattern for query creation
class QueryFactory {
  static create(domain: string, type: string, requester: string, params: any, target?: string): VQPQuery {
    switch (domain) {
      case 'identity':
        switch (type) {
          case 'age': return IdentityQueries.ageVerification(requester, params.minAge, target);
          case 'citizenship': return IdentityQueries.citizenshipCheck(requester, params.country, target);
          case 'credential': return IdentityQueries.credentialCheck(requester, params.credential, target);
          default: throw new Error(`Unknown identity query type: ${type}`);
        }
      case 'financial':
        switch (type) {
          case 'income': return FinancialQueries.incomeVerification(requester, params.minIncome, target);
          case 'employment': return FinancialQueries.employmentCheck(requester, target);
          case 'loan': return FinancialQueries.loanEligibility(requester, params.minIncome, params.maxDebtRatio, params.minCreditScore, target);
          default: throw new Error(`Unknown financial query type: ${type}`);
        }
      default:
        throw new Error(`Unknown domain: ${domain}`);
    }
  }
}

// Example usage
async function demonstrateCustomExtensions() {
  const requester = 'did:web:my-app.com';
  
  console.log('=== Custom Query Extensions Example ===\n');

  // Identity queries
  const ageQuery = IdentityQueries.ageVerification(requester, 21);
  console.log('Age verification query:', JSON.stringify(ageQuery, null, 2));

  // Financial queries
  const loanQuery = FinancialQueries.loanEligibility(requester, 50000, 0.4, 650);
  console.log('\nLoan eligibility query:', JSON.stringify(loanQuery, null, 2));

  // Health queries
  const vaccineQuery = HealthQueries.vaccinationStatus(requester, 'COVID-19', 2);
  console.log('\nVaccination status query:', JSON.stringify(vaccineQuery, null, 2));

  // System queries
  const healthQuery = SystemQueries.healthCheck(requester);
  console.log('\nSystem health query:', JSON.stringify(healthQuery, null, 2));

  // Custom domain queries
  const clearanceQuery = AcmeCorpQueries.securityClearance(requester, 'confidential');
  console.log('\nSecurity clearance query:', JSON.stringify(clearanceQuery, null, 2));

  // Factory pattern usage
  const factoryQuery = QueryFactory.create('identity', 'age', requester, { minAge: 18 });
  console.log('\nFactory-created query:', JSON.stringify(factoryQuery, null, 2));

  console.log('\n✅ All custom extensions work with the generic QueryBuilder!');
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateCustomExtensions().catch(console.error);
}

export {
  IdentityQueries,
  FinancialQueries,
  HealthQueries,
  SystemQueries,
  AcmeCorpQueries,
  QueryFactory,
  demonstrateCustomExtensions
};
