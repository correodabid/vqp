/**
 * Memory Transport Adapter - In-memory transport for testing and development
 */

import { QueryPort } from '../../domain/ports/primary.js';
import { VQPQuery, VQPResponse, VQPError } from '../../domain/types.js';
import { VQPService } from '../../domain/vqp-service.js';

export interface MemoryTransportConfig {
  // No configuration needed for memory transport
}

export class MemoryTransportAdapter implements QueryPort {
  private vqpService: VQPService;

  constructor(vqpService: VQPService, config: MemoryTransportConfig = {}) {
    this.vqpService = vqpService;
  }

  /**
   * Receive and process a VQP query
   */
  async receiveQuery(query: VQPQuery): Promise<VQPResponse> {
    try {
      return await this.vqpService.processQuery(query);
    } catch (error) {
      if (error instanceof VQPError) {
        throw error;
      }
      throw new VQPError('PROCESSING_ERROR', `Query processing failed: ${error}`);
    }
  }

  /**
   * Validate a VQP query structure
   */
  async validateQuery(query: VQPQuery): Promise<boolean> {
    try {
      // Basic validation
      if (!query.id || !query.version || !query.timestamp || !query.requester) {
        return false;
      }

      if (!query.query || !query.query.lang || !query.query.vocab || !query.query.expr) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start the transport (no-op for memory transport)
   */
  async start(): Promise<void> {
    // No-op for memory transport
  }

  /**
   * Stop the transport (no-op for memory transport)
   */
  async stop(): Promise<void> {
    // No-op for memory transport
  }
}
