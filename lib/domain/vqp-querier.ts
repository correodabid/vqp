import { VQPQuery, VQPResponse } from './types';
import { VQPVerifier } from './vqp-verifier';
import { CryptographicPort, NetworkPort } from './ports/secondary';

/**
 * VQP Querier - High-level client for sending queries and verifying responses
 *
 * This component combines query sending with response verification,
 * providing a convenient API for applications that need to query VQP responders.
 */
export class VQPQuerier {
  private verifier: VQPVerifier;

  constructor(
    private network: NetworkPort,
    private crypto: CryptographicPort,
    private identity: string // DID of this querier
  ) {
    this.verifier = new VQPVerifier(crypto);
  }

  /**
   * Send a query to a VQP responder and return the response
   */
  async query(endpoint: string, query: VQPQuery): Promise<VQPResponse> {
    // Add querier identity if not set
    if (!query.requester) {
      query.requester = this.identity;
    }

    // Send query via network adapter
    return await this.network.sendQuery(endpoint, query);
  }

  /**
   * Verify a VQP response (cryptographic proof + metadata)
   */
  async verify(response: VQPResponse, originalQueryId?: string): Promise<boolean> {
    const result = await this.verifier.verifyComplete(response, originalQueryId);
    return result.overall;
  }

  /**
   * Send query and verify response in one call
   */
  async queryAndVerify(
    endpoint: string,
    query: VQPQuery
  ): Promise<{
    response: VQPResponse;
    verified: boolean;
    verificationDetails: {
      cryptographicProof: boolean;
      metadata: boolean;
    };
  }> {
    const response = await this.query(endpoint, query);
    const verificationResult = await this.verifier.verifyComplete(response, query.id);

    return {
      response,
      verified: verificationResult.overall,
      verificationDetails: {
        cryptographicProof: verificationResult.cryptographicProof,
        metadata: verificationResult.metadata,
      },
    };
  }

  /**
   * Broadcast a query to multiple responders
   */
  async broadcast(query: VQPQuery): Promise<VQPResponse[]> {
    return await this.network.broadcastQuery(query);
  }

  /**
   * Discover responders with specific capabilities
   */
  async discover(
    capability: string
  ): Promise<Array<{ endpoint: string; did: string; capabilities: string[] }>> {
    return await this.network.discoverPeers(capability);
  }
}

/**
 * Query Builder - Fluent API for constructing VQP queries
 */
export class QueryBuilder {
  private query: Partial<VQPQuery> = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    query: {
      lang: 'jsonlogic@1.0.0' as const,
      vocab: '',
      expr: {},
    },
  };

  constructor() {
    this.query.id = this.generateUUID();
  }

  /**
   * Set the target responder DID
   */
  target(did: string): QueryBuilder {
    this.query.target = did;
    return this;
  }

  /**
   * Set the requester DID
   */
  requester(did: string): QueryBuilder {
    this.query.requester = did;
    return this;
  }

  /**
   * Set the vocabulary to use
   */
  vocabulary(vocab: string): QueryBuilder {
    if (this.query.query) {
      this.query.query.vocab = vocab;
    }
    return this;
  }

  /**
   * Set the JSONLogic expression
   */
  expression(expr: object): QueryBuilder {
    if (this.query.query) {
      this.query.query.expr = expr;
    }
    return this;
  }

  /**
   * Helper: Create age verification query
   */
  ageCheck(minAge: number): QueryBuilder {
    return this.vocabulary('vqp:identity:v1').expression({ '>=': [{ var: 'age' }, minAge] });
  }

  /**
   * Helper: Create citizenship check query
   */
  citizenshipCheck(country: string): QueryBuilder {
    return this.vocabulary('vqp:identity:v1').expression({
      '==': [{ var: 'citizenship' }, country],
    });
  }

  /**
   * Helper: Create income verification query
   */
  incomeCheck(minIncome: number): QueryBuilder {
    return this.vocabulary('vqp:financial:v1').expression({
      '>=': [{ var: 'annual_income' }, minIncome],
    });
  }

  /**
   * Helper: Create system health check
   */
  healthCheck(): QueryBuilder {
    return this.vocabulary('vqp:metrics:v1').expression({
      and: [
        { '>=': [{ var: 'uptime_percentage_24h' }, 99] },
        { '==': [{ var: 'health_status' }, 'healthy'] },
      ],
    });
  }

  /**
   * Build the final query
   */
  build(): VQPQuery {
    if (!this.query.query?.vocab) {
      throw new Error('Vocabulary must be specified');
    }

    if (!this.query.query?.expr || Object.keys(this.query.query.expr).length === 0) {
      throw new Error('Expression must be specified');
    }

    return this.query as VQPQuery;
  }

  /**
   * Generate a simple UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
