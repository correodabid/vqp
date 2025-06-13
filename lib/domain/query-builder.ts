/**
 * Query Builder - Fluent interface for building VQP queries
 */

import { VQPQuery } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class QueryBuilder {
  private query: Partial<VQPQuery> = {};

  constructor() {
    this.query = {
      id: uuidv4(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Set the requester DID
   */
  requester(did: string): QueryBuilder {
    this.query.requester = did;
    return this;
  }

  /**
   * Set the target DID (optional for broadcast queries)
   */
  target(did: string): QueryBuilder {
    this.query.target = did;
    return this;
  }

  /**
   * Set the vocabulary URI
   */
  vocabulary(vocabUri: string): QueryBuilder {
    if (!this.query.query) {
      this.query.query = {
        lang: 'jsonlogic@1.0.0',
        vocab: vocabUri,
        expr: {},
      };
    } else {
      this.query.query.vocab = vocabUri;
    }
    return this;
  }

  /**
   * Set the query expression
   */
  expression(expr: object): QueryBuilder {
    if (!this.query.query) {
      this.query.query = {
        lang: 'jsonlogic@1.0.0',
        vocab: '',
        expr: expr,
      };
    } else {
      this.query.query.expr = expr;
    }
    return this;
  }

  /**
   * Set a custom query ID
   */
  id(queryId: string): QueryBuilder {
    this.query.id = queryId;
    return this;
  }

  /**
   * Set a custom timestamp
   */
  timestamp(timestamp: string): QueryBuilder {
    this.query.timestamp = timestamp;
    return this;
  }

  /**
   * Set the query language (defaults to jsonlogic@1.0.0)
   */
  language(lang: 'jsonlogic@1.0.0'): QueryBuilder {
    if (!this.query.query) {
      this.query.query = {
        lang: lang,
        vocab: '',
        expr: {},
      };
    } else {
      this.query.query.lang = lang;
    }
    return this;
  }

  /**
   * Build the complete VQP query
   */
  build(): VQPQuery {
    if (!this.query.id || !this.query.version || !this.query.timestamp || !this.query.requester) {
      throw new Error('Missing required query fields: id, version, timestamp, requester');
    }

    if (!this.query.query || !this.query.query.vocab || !this.query.query.expr) {
      throw new Error('Missing required query fields: vocab, expr');
    }

    return this.query as VQPQuery;
  }

  /**
   * Convenience method: Create age verification query
   */
  static ageVerification(requester: string, minAge: number, target?: string): VQPQuery {
    const builder = new QueryBuilder()
      .requester(requester)
      .vocabulary('vqp:identity:v1')
      .expression({
        '>=': [{ var: 'age' }, minAge],
      });

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }

  /**
   * Convenience method: Create citizenship verification query
   */
  static citizenshipVerification(requester: string, country: string, target?: string): VQPQuery {
    const builder = new QueryBuilder()
      .requester(requester)
      .vocabulary('vqp:identity:v1')
      .expression({
        '==': [{ var: 'citizenship' }, country],
      });

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }

  /**
   * Convenience method: Create income verification query
   */
  static incomeVerification(requester: string, minIncome: number, target?: string): VQPQuery {
    const builder = new QueryBuilder()
      .requester(requester)
      .vocabulary('vqp:financial:v1')
      .expression({
        '>=': [{ var: 'annual_income' }, minIncome],
      });

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }

  /**
   * Convenience method: Create system health query
   */
  static systemHealth(requester: string, target?: string): VQPQuery {
    const builder = new QueryBuilder()
      .requester(requester)
      .vocabulary('vqp:metrics:v1')
      .expression({
        and: [
          { '>=': [{ var: 'uptime_percentage_24h' }, 99.0] },
          { '<=': [{ var: 'response_time_p95_ms' }, 500] },
          { '==': [{ var: 'health_status' }, 'healthy'] },
        ],
      });

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }
}
