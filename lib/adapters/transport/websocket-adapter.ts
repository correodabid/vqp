/**
 * WebSocket Transport Adapter - Implements QueryPort and NetworkPort using WebSocket
 * This adapter handles real-time WebSocket connections for VQP communication
 */

import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { QueryPort } from '../../domain/ports/primary.js';
import { NetworkPort } from '../../domain/ports/secondary.js';
import { VQPQuery, VQPResponse, VQPError } from '../../domain/types.js';

export interface WebSocketMessage {
  type: 'query' | 'response' | 'error' | 'ping' | 'pong';
  id: string;
  payload: any;
  timestamp: string;
}

export interface WebSocketAdapterConfig {
  port?: number;
  maxConnections?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  maxMessageSize?: number;
}

/**
 * WebSocket Transport Adapter
 * Supports both server (QueryPort) and client (NetworkPort) functionality
 */
export class WebSocketTransportAdapter implements QueryPort, NetworkPort {
  private wss: WebSocketServer | undefined;
  private server?: Server;
  private connections = new Map<string, WebSocket>();
  private pendingQueries = new Map<
    string,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  >();
  private heartbeatInterval: NodeJS.Timeout | undefined;

  constructor(
    private vqpService: { processQuery(query: VQPQuery): Promise<VQPResponse> },
    private config: WebSocketAdapterConfig = {}
  ) {
    this.config = {
      port: 8080,
      maxConnections: 1000,
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 60000, // 60 seconds
      maxMessageSize: 1024 * 1024, // 1MB
      ...config,
    };
  }

  // QueryPort Implementation (Server side)
  async receiveQuery(query: VQPQuery): Promise<VQPResponse> {
    return await this.vqpService.processQuery(query);
  }

  async validateQuery(query: VQPQuery): Promise<boolean> {
    try {
      return !!(
        query.id &&
        query.version &&
        query.timestamp &&
        query.requester &&
        query.query &&
        query.query.lang &&
        query.query.vocab &&
        query.query.expr
      );
    } catch {
      return false;
    }
  }

  // NetworkPort Implementation (Client side)
  async sendQuery(endpoint: string, query: VQPQuery): Promise<VQPResponse> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(endpoint);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Query timeout'));
        }, this.config.connectionTimeout);

        ws.on('open', () => {
          const message: WebSocketMessage = {
            type: 'query',
            id: query.id,
            payload: query,
            timestamp: new Date().toISOString(),
          };
          ws.send(JSON.stringify(message));
        });

        ws.on('message', (data) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());

            if (message.type === 'response' && message.id === query.id) {
              clearTimeout(timeout);
              ws.close();
              resolve(message.payload as VQPResponse);
            } else if (message.type === 'error' && message.id === query.id) {
              clearTimeout(timeout);
              ws.close();
              reject(new Error(message.payload.message || 'Query failed'));
            }
          } catch (error) {
            clearTimeout(timeout);
            ws.close();
            reject(error);
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        ws.on('close', () => {
          clearTimeout(timeout);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async broadcastQuery(query: VQPQuery): Promise<VQPResponse[]> {
    const responses: VQPResponse[] = [];
    const promises: Promise<VQPResponse>[] = [];

    // Send to all connected clients that can handle the query
    this.connections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        promises.push(this.sendQueryToConnection(ws, query));
      }
    });

    // Wait for all responses (with timeout)
    const results = await Promise.allSettled(promises);

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      }
    });

    return responses;
  }

  async discoverPeers(
    capability: string
  ): Promise<Array<{ endpoint: string; did: string; capabilities: string[] }>> {
    // This would typically integrate with a discovery service
    // For now, return connected peers that advertise the capability
    const peers: Array<{ endpoint: string; did: string; capabilities: string[] }> = [];

    // In a real implementation, this would query a discovery service
    // or maintain a registry of peer capabilities

    return peers;
  }

  async isReachable(endpoint: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(endpoint);
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000); // 5 second timeout

        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        });

        ws.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Start the WebSocket server
   */
  async start(server?: Server): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (server) {
          this.server = server;
          this.wss = new WebSocketServer({ server });
        } else {
          this.wss = new WebSocketServer({ port: this.config.port });
        }

        this.wss.on('connection', (ws, request) => {
          this.handleConnection(ws, request);
        });

        this.wss.on('listening', () => {
          console.log(`VQP WebSocket server listening on port ${this.config.port}`);
          this.startHeartbeat();
          resolve();
        });

        this.wss.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        delete (this as any).heartbeatInterval;
      }

      // Close all connections forcefully
      this.connections.forEach((ws, connectionId) => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.terminate(); // Force close instead of graceful close
          }
        } catch (error) {
          console.warn(`Error closing connection ${connectionId}:`, error);
        }
      });
      this.connections.clear();

      // Clear pending queries
      this.pendingQueries.forEach(({ reject, timeout }) => {
        try {
          clearTimeout(timeout);
          reject(new Error('Server shutting down'));
        } catch (error) {
          console.warn('Error rejecting pending query:', error);
        }
      });
      this.pendingQueries.clear();

      if (this.wss) {
        // Force close all server connections
        this.wss.clients.forEach((ws) => {
          try {
            ws.terminate();
          } catch (error) {
            console.warn('Error terminating client:', error);
          }
        });

        this.wss.close((error) => {
          if (error) {
            console.warn('Error closing WebSocket server:', error);
          } else {
            console.log('VQP WebSocket server stopped');
          }
          delete (this as any).wss;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const connectionId = this.generateConnectionId();

    // Check connection limit
    if (this.connections.size >= this.config.maxConnections!) {
      ws.close(1008, 'Too many connections');
      return;
    }

    this.connections.set(connectionId, ws);
    console.log(`WebSocket connection established: ${connectionId}`);

    // Set up message size limit
    ws.on('message', async (data) => {
      try {
        // Convert data to string for size check
        const dataString = data.toString();

        if (dataString.length > this.config.maxMessageSize!) {
          this.sendError(ws, 'MESSAGE_TOO_LARGE', 'Message exceeds size limit');
          return;
        }

        const message: WebSocketMessage = JSON.parse(dataString);
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        this.sendError(ws, 'INVALID_MESSAGE', 'Failed to parse message');
      }
    });

    ws.on('close', () => {
      this.connections.delete(connectionId);
      console.log(`WebSocket connection closed: ${connectionId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      this.connections.delete(connectionId);
    });

    // Send welcome message
    this.sendMessage(ws, {
      type: 'ping',
      id: this.generateMessageId(),
      payload: { message: 'VQP WebSocket connection established' },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'query':
        await this.handleQueryMessage(ws, message);
        break;

      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          id: message.id,
          payload: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
        break;

      case 'pong':
        // Handle pong for heartbeat
        break;

      case 'response':
      case 'error':
        // Handle responses to our queries
        this.handleQueryResponse(message);
        break;

      default:
        this.sendError(ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle query message from client
   */
  private async handleQueryMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    try {
      const query: VQPQuery = message.payload;

      // Validate query
      if (!(await this.validateQuery(query))) {
        this.sendError(ws, 'INVALID_QUERY', 'Invalid query structure', message.id);
        return;
      }

      // Process query
      const response = await this.receiveQuery(query);

      // Send response
      this.sendMessage(ws, {
        type: 'response',
        id: message.id,
        payload: response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Query processing error:', error);
      const vqpError = error as VQPError;
      this.sendError(
        ws,
        vqpError.code || 'EVALUATION_ERROR',
        vqpError.message || 'Query processing failed',
        message.id
      );
    }
  }

  /**
   * Handle query response (for client-side queries)
   */
  private handleQueryResponse(message: WebSocketMessage): void {
    const pending = this.pendingQueries.get(message.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingQueries.delete(message.id);

      if (message.type === 'response') {
        pending.resolve(message.payload);
      } else {
        pending.reject(new Error(message.payload.message || 'Query failed'));
      }
    }
  }

  /**
   * Send query to a specific connection
   */
  private async sendQueryToConnection(ws: WebSocket, query: VQPQuery): Promise<VQPResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingQueries.delete(query.id);
        reject(new Error('Query timeout'));
      }, this.config.connectionTimeout);

      this.pendingQueries.set(query.id, { resolve, reject, timeout });

      const message: WebSocketMessage = {
        type: 'query',
        id: query.id,
        payload: query,
        timestamp: new Date().toISOString(),
      };

      ws.send(JSON.stringify(message));
    });
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, code: string, message: string, queryId?: string): void {
    this.sendMessage(ws, {
      type: 'error',
      id: queryId || this.generateMessageId(),
      payload: { code, message },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((ws, connectionId) => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendMessage(ws, {
            type: 'ping',
            id: this.generateMessageId(),
            payload: { heartbeat: true },
            timestamp: new Date().toISOString(),
          });
        } else {
          this.connections.delete(connectionId);
        }
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connected client endpoints
   */
  getConnectedEndpoints(): string[] {
    const endpoints: string[] = [];
    this.connections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        endpoints.push(connectionId);
      }
    });
    return endpoints;
  }
}
