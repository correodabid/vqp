/**
 * HTTP Transport Adapter - Implements QueryPort using Express.js
 * This adapter handles HTTP requests and delegates to the VQP service
 */

import express, { Request, Response, Application } from 'express';
import { Server } from 'http';
import { QueryPort } from '../../domain/ports/primary.js';
import { VQPQuery, VQPResponse, VQPError } from '../../domain/types.js';

export class HTTPTransportAdapter implements QueryPort {
  private app: Application;
  private server?: Server;

  constructor(
    private vqpService: { processQuery(query: VQPQuery): Promise<VQPResponse> },
    private config: {
      port?: number;
      corsOrigins?: string[];
      rateLimitWindowMs?: number;
      rateLimitMax?: number;
    } = {}
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  async receiveQuery(query: VQPQuery): Promise<VQPResponse> {
    return await this.vqpService.processQuery(query);
  }

  async validateQuery(query: VQPQuery): Promise<boolean> {
    try {
      // Basic structural validation
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

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // JSON parsing
    this.app.use(express.json({ limit: '1mb' }));

    // CORS if configured
    if (this.config.corsOrigins) {
      this.app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && this.config.corsOrigins!.includes(origin)) {
          res.header('Access-Control-Allow-Origin', origin);
        }
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
      });
    }

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    // Main VQP query endpoint
    this.app.post('/vqp/query', async (req: Request, res: Response): Promise<void> => {
      try {
        const query: VQPQuery = req.body;

        // Validate request
        if (!(await this.validateQuery(query))) {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY',
              message: 'Invalid query structure',
            },
          });
          return;
        }

        // Process query
        const response = await this.receiveQuery(query);

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/vqp+json');
        res.json(response);
      } catch (error) {
        console.error('VQP Query Error:', error);

        const vqpError = error as VQPError;
        const statusCode = this.getStatusCodeForError(vqpError.code);

        res.status(statusCode).json({
          error: {
            code: vqpError.code,
            message: vqpError.message,
            details: vqpError.details,
          },
        });
      }
    });

    // Batch query endpoint (future feature)
    this.app.post('/vqp/batch', async (req: Request, res: Response) => {
      res.status(501).json({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Batch queries not yet implemented',
        },
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
        },
      });
    });
  }

  /**
   * Map VQP error codes to HTTP status codes
   */
  private getStatusCodeForError(code: VQPError['code']): number {
    switch (code) {
      case 'INVALID_QUERY':
        return 400;
      case 'UNAUTHORIZED':
        return 403;
      case 'VOCABULARY_NOT_FOUND':
        return 404;
      case 'RATE_LIMITED':
        return 429;
      case 'EVALUATION_ERROR':
      case 'CRYPTO_ERROR':
        return 500;
      case 'SIGNATURE_FAILED':
        return 500;
      case 'NETWORK_ERROR':
        return 502;
      default:
        return 500;
    }
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    const port = this.config.port || 8080;

    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`VQP HTTP server listening on port ${port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('VQP HTTP server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Get the Express app instance for testing
   */
  getApp(): Application {
    return this.app;
  }
}
