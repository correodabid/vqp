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
   * Create a query with a simple field comparison
   */
  static compare(
    requester: string,
    vocabulary: string,
    field: string,
    operator: '>=' | '<=' | '==' | '!=' | '>' | '<',
    value: any,
    target?: string
  ): VQPQuery {
    const builder = new QueryBuilder()
      .requester(requester)
      .vocabulary(vocabulary)
      .expression({
        [operator]: [{ var: field }, value],
      });

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }

  /**
   * Create a query with an 'and' condition
   */
  static and(
    requester: string,
    vocabulary: string,
    conditions: object[],
    target?: string
  ): VQPQuery {
    const builder = new QueryBuilder().requester(requester).vocabulary(vocabulary).expression({
      and: conditions,
    });

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }

  /**
   * Create a query with an 'or' condition
   */
  static or(
    requester: string,
    vocabulary: string,
    conditions: object[],
    target?: string
  ): VQPQuery {
    const builder = new QueryBuilder().requester(requester).vocabulary(vocabulary).expression({
      or: conditions,
    });

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }

  /**
   * Create a query with an 'in' condition (array membership)
   */
  static in(
    requester: string,
    vocabulary: string,
    value: any,
    arrayField: string,
    target?: string
  ): VQPQuery {
    const builder = new QueryBuilder()
      .requester(requester)
      .vocabulary(vocabulary)
      .expression({
        in: [value, { var: arrayField }],
      });

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }

  /**
   * Create a query from raw JSONLogic expression
   */
  static fromExpression(
    requester: string,
    vocabulary: string,
    expression: object,
    target?: string
  ): VQPQuery {
    const builder = new QueryBuilder()
      .requester(requester)
      .vocabulary(vocabulary)
      .expression(expression);

    if (target) {
      builder.target(target);
    }

    return builder.build();
  }
}
