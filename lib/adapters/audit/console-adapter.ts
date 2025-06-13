/**
 * Console Audit Adapter - Implements AuditPort using console logging
 * This adapter logs audit events to the console for development/testing
 */

import { AuditPort } from '../../domain/ports/secondary.js';
import { VQPQuery, VQPResponse, VQPError, AuditEntry } from '../../domain/types.js';

export interface ConsoleAuditConfig {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  includeFullQuery?: boolean;
  includeFullResponse?: boolean;
  maxEntries?: number;
}

export class ConsoleAuditAdapter implements AuditPort {
  private entries: AuditEntry[] = [];
  private readonly maxEntries: number;

  constructor(private config: ConsoleAuditConfig = {}) {
    this.maxEntries = config.maxEntries || 1000;
  }

  async logQuery(query: VQPQuery, response: VQPResponse): Promise<void> {
    const responseTime =
      new Date(response.timestamp).getTime() - new Date(query.timestamp).getTime();

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event: 'query_processed',
      queryId: query.id,
      querier: query.requester,
      metadata: {
        vocabulary: query.query.vocab,
        responseTime,
        ...(this.config.includeFullQuery && { fullQuery: query }),
        ...(this.config.includeFullResponse && { fullResponse: response }),
      },
    };

    // Only include result if it's a boolean
    if (typeof response.result === 'boolean') {
      entry.result = response.result;
    }

    this.addEntry(entry);

    // Console output
    const logData = {
      queryId: query.id,
      querier: this.truncateDID(query.requester),
      vocabulary: query.query.vocab,
      result: response.result,
      responseTime: `${responseTime}ms`,
    };

    console.log(`[VQP] Query processed:`, logData);
  }

  async logError(error: VQPError, context: any): Promise<void> {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event: 'error_occurred',
      queryId: context.query?.id,
      querier: context.query?.requester,
      error,
      metadata: {
        context: this.sanitizeContext(context),
      },
    };

    this.addEntry(entry);

    // Console output
    console.error(`[VQP] Error occurred:`, {
      code: error.code,
      message: error.message,
      queryId: context.query?.id,
      querier: context.query?.requester ? this.truncateDID(context.query.requester) : undefined,
    });
  }

  async getAuditTrail(filters?: {
    startTime?: string;
    endTime?: string;
    querier?: string;
    event?: string;
  }): Promise<AuditEntry[]> {
    let filtered = [...this.entries];

    if (filters) {
      if (filters.startTime) {
        const startTime = new Date(filters.startTime).getTime();
        filtered = filtered.filter((entry) => new Date(entry.timestamp).getTime() >= startTime);
      }

      if (filters.endTime) {
        const endTime = new Date(filters.endTime).getTime();
        filtered = filtered.filter((entry) => new Date(entry.timestamp).getTime() <= endTime);
      }

      if (filters.querier) {
        filtered = filtered.filter((entry) => entry.querier === filters.querier);
      }

      if (filters.event) {
        filtered = filtered.filter((entry) => entry.event === filters.event);
      }
    }

    return filtered;
  }

  async purgeOldEntries(olderThan: string): Promise<number> {
    const cutoffTime = new Date(olderThan).getTime();
    const initialCount = this.entries.length;

    this.entries = this.entries.filter((entry) => new Date(entry.timestamp).getTime() > cutoffTime);

    const purgedCount = initialCount - this.entries.length;

    if (purgedCount > 0) {
      console.log(`[VQP] Purged ${purgedCount} old audit entries`);
    }

    return purgedCount;
  }

  /**
   * Add entry to the audit log
   */
  private addEntry(entry: AuditEntry): void {
    this.entries.push(entry);

    // Trim entries if we exceed max
    if (this.entries.length > this.maxEntries) {
      const excess = this.entries.length - this.maxEntries;
      this.entries.splice(0, excess);
      console.warn(`[VQP] Audit log trimmed, removed ${excess} old entries`);
    }
  }

  /**
   * Truncate DID for readable logging
   */
  private truncateDID(did: string): string {
    if (did.length <= 20) return did;
    return `${did.substring(0, 8)}...${did.substring(did.length - 8)}`;
  }

  /**
   * Sanitize context for logging (remove sensitive data)
   */
  private sanitizeContext(context: any): any {
    const sanitized = { ...context };

    // Remove full query/response to avoid logging sensitive data
    if (sanitized.query && !this.config.includeFullQuery) {
      sanitized.query = {
        id: sanitized.query.id,
        requester: sanitized.query.requester,
        vocab: sanitized.query.query?.vocab,
      };
    }

    return sanitized;
  }

  /**
   * Get audit statistics
   */
  getStats(): {
    totalEntries: number;
    events: Record<string, number>;
    queriers: Record<string, number>;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const events: Record<string, number> = {};
    const queriers: Record<string, number> = {};

    for (const entry of this.entries) {
      events[entry.event] = (events[entry.event] || 0) + 1;
      if (entry.querier) {
        queriers[entry.querier] = (queriers[entry.querier] || 0) + 1;
      }
    }

    const result: {
      totalEntries: number;
      events: Record<string, number>;
      queriers: Record<string, number>;
      oldestEntry?: string;
      newestEntry?: string;
    } = {
      totalEntries: this.entries.length,
      events,
      queriers,
    };

    // Only include entries if they exist
    if (this.entries.length > 0) {
      const oldest = this.entries[0]?.timestamp;
      const newest = this.entries[this.entries.length - 1]?.timestamp;

      if (oldest) {
        result.oldestEntry = oldest;
      }
      if (newest) {
        result.newestEntry = newest;
      }
    }

    return result;
  }

  /**
   * Clear all audit entries
   */
  clear(): void {
    this.entries = [];
    console.log('[VQP] Audit log cleared');
  }
}
