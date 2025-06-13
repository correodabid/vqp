/**
 * Memory Audit Adapter - Implements AuditPort using in-memory storage
 * This adapter stores audit events in memory for testing and lightweight deployments
 */

import { AuditPort } from '../../domain/ports/secondary.js';
import { VQPQuery, VQPResponse, VQPError, AuditEntry } from '../../domain/types.js';

export interface MemoryAuditConfig {
  maxEntries?: number; // Maximum number of entries to keep (default: 10000)
  includeFullQuery?: boolean; // Include full query in logs
  includeFullResponse?: boolean; // Include full response in logs
  autoCleanup?: boolean; // Automatically remove old entries when maxEntries is reached
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class MemoryAuditAdapter implements AuditPort {
  private entries: AuditEntry[] = [];
  private readonly maxEntries: number;
  private readonly includeFullQuery: boolean;
  private readonly includeFullResponse: boolean;
  private readonly autoCleanup: boolean;
  private readonly logLevel: string;

  constructor(config: MemoryAuditConfig = {}) {
    this.maxEntries = config.maxEntries || 10000;
    this.includeFullQuery = config.includeFullQuery || false;
    this.includeFullResponse = config.includeFullResponse || false;
    this.autoCleanup = config.autoCleanup !== false; // Default to true
    this.logLevel = config.logLevel || 'info';
  }

  async logQuery(query: VQPQuery, response: VQPResponse): Promise<void> {
    const responseTime =
      new Date(response.timestamp).getTime() - new Date(query.timestamp).getTime();

    const entry: AuditEntry = {
      timestamp: response.timestamp, // Use response timestamp for consistency
      event: 'query_processed',
      metadata: {
        vocabulary: query.query.vocab,
        responseTime,
        target: query.target,
        responder: response.responder,
        proofType: response.proof.type,
        ...(this.includeFullQuery && { fullQuery: query }),
        ...(this.includeFullResponse && { fullResponse: response }),
      },
    };

    // Add optional fields only if they have values
    if (query.id) {
      entry.queryId = query.id;
    }

    if (query.requester) {
      entry.querier = query.requester;
    }

    // Only include result if it's a boolean
    if (typeof response.result === 'boolean') {
      entry.result = response.result;
    }

    this.addEntry(entry);
  }

  async logError(error: VQPError, context: any): Promise<void> {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event: 'error_occurred',
      error: {
        name: error.name,
        code: error.code,
        message: error.message,
        details: error.details,
      } as any,
      metadata: {
        errorCode: error.code,
        errorMessage: error.message,
        context: this.sanitizeContext(context),
      },
    };

    this.addEntry(entry);
  }

  async getAuditTrail(filters?: {
    startTime?: string;
    endTime?: string;
    querier?: string;
    event?: string;
  }): Promise<AuditEntry[]> {
    let filteredEntries = [...this.entries];

    if (!filters) {
      return filteredEntries;
    }

    // Apply time range filter
    if (filters.startTime) {
      const startTime = new Date(filters.startTime);
      filteredEntries = filteredEntries.filter((entry) => new Date(entry.timestamp) >= startTime);
    }

    if (filters.endTime) {
      const endTime = new Date(filters.endTime);
      filteredEntries = filteredEntries.filter((entry) => new Date(entry.timestamp) <= endTime);
    }

    // Apply querier filter
    if (filters.querier) {
      filteredEntries = filteredEntries.filter((entry) => entry.querier === filters.querier);
    }

    // Apply event filter
    if (filters.event) {
      filteredEntries = filteredEntries.filter((entry) => entry.event === filters.event);
    }

    // Sort by timestamp (newest first)
    return filteredEntries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async purgeOldEntries(olderThan: string): Promise<number> {
    const cutoffTime = new Date(olderThan);
    const originalCount = this.entries.length;

    this.entries = this.entries.filter((entry) => new Date(entry.timestamp) > cutoffTime);

    return originalCount - this.entries.length;
  }

  /**
   * Get current number of stored entries
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Clear all entries (useful for testing)
   */
  clearAll(): void {
    this.entries = [];
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    entryCount: number;
    maxEntries: number;
    memoryUsageBytes: number;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const memoryUsageBytes = this.estimateMemoryUsage();
    const stats: {
      entryCount: number;
      maxEntries: number;
      memoryUsageBytes: number;
      oldestEntry?: string;
      newestEntry?: string;
    } = {
      entryCount: this.entries.length,
      maxEntries: this.maxEntries,
      memoryUsageBytes,
    };

    if (this.entries.length > 0) {
      const oldestEntry = this.entries[this.entries.length - 1];
      const newestEntry = this.entries[0];

      if (oldestEntry) {
        stats.oldestEntry = oldestEntry.timestamp;
      }

      if (newestEntry) {
        stats.newestEntry = newestEntry.timestamp;
      }
    }

    return stats;
  }

  private addEntry(entry: AuditEntry): void {
    // Insert at the beginning to maintain newest-first order
    this.entries.unshift(entry);

    // Perform auto-cleanup if enabled and we exceed maxEntries
    if (this.autoCleanup && this.entries.length > this.maxEntries) {
      // Remove oldest entries (from the end of the array)
      this.entries = this.entries.slice(0, this.maxEntries);
    }
  }

  private sanitizeContext(context: any): any {
    if (!context) return null;

    // Create a sanitized copy of the context
    try {
      const sanitized = JSON.parse(JSON.stringify(context));

      // Remove potentially sensitive fields
      if (typeof sanitized === 'object') {
        delete sanitized.privateKey;
        delete sanitized.password;
        delete sanitized.secret;
        delete sanitized.token;

        // Recursively sanitize nested objects
        Object.keys(sanitized).forEach((key) => {
          if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = this.sanitizeContext(sanitized[key]);
          }
        });
      }

      return sanitized;
    } catch {
      // If serialization fails, return a safe representation
      return { type: typeof context, error: 'Serialization failed' };
    }
  }

  private estimateMemoryUsage(): number {
    try {
      // Rough estimation of memory usage
      const jsonString = JSON.stringify(this.entries);
      return jsonString.length * 2; // Approximate bytes (UTF-16)
    } catch {
      // Fallback estimation
      return this.entries.length * 1000; // Rough estimate: 1KB per entry
    }
  }

  /**
   * Get entries by event type
   */
  getEntriesByEvent(eventType: AuditEntry['event']): AuditEntry[] {
    return this.entries.filter((entry) => entry.event === eventType);
  }

  /**
   * Get recent entries (last N entries)
   */
  getRecentEntries(count: number = 100): AuditEntry[] {
    return this.entries.slice(0, Math.min(count, this.entries.length));
  }

  /**
   * Search entries by metadata
   */
  searchEntries(searchTerm: string): AuditEntry[] {
    const term = searchTerm.toLowerCase();

    return this.entries.filter((entry) => {
      // Search in queryId
      if (entry.queryId?.toLowerCase().includes(term)) return true;

      // Search in querier
      if (entry.querier?.toLowerCase().includes(term)) return true;

      // Search in metadata
      if (entry.metadata) {
        const metadataString = JSON.stringify(entry.metadata).toLowerCase();
        if (metadataString.includes(term)) return true;
      }

      // Search in error details
      if (entry.error) {
        const errorString = JSON.stringify(entry.error).toLowerCase();
        if (errorString.includes(term)) return true;
      }

      return false;
    });
  }
}
