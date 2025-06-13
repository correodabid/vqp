/**
 * VQP System Assembly - Configures and assembles the complete VQP system
 * This follows the hexagonal architecture pattern by wiring up all adapters
 */

import { VQPService } from './domain/vqp-service.js';
import { VQPVerifier } from './domain/vqp-verifier.js';
import { VQPError, VQPResponse } from './domain/types.js';

// Adapters
import { HTTPTransportAdapter } from './adapters/transport/http-adapter.js';
import { MemoryTransportAdapter } from './adapters/transport/memory-adapter.js';
import { FileSystemDataAdapter, FileSystemDataConfig } from './adapters/data/filesystem-adapter.js';
import { SoftwareCryptoAdapter, SoftwareCryptoConfig } from './adapters/crypto/software-adapter.js';
import { SnarkjsCryptoAdapter, SnarkjsConfig } from './adapters/crypto/snarkjs-adapter.js';
import { HTTPVocabularyAdapter, HTTPVocabularyConfig } from './adapters/vocabulary/http-adapter.js';
import { ConsoleAuditAdapter, ConsoleAuditConfig } from './adapters/audit/console-adapter.js';
import { FileAuditAdapter, FileAuditConfig } from './adapters/audit/file-adapter.js';
import { MemoryAuditAdapter, MemoryAuditConfig } from './adapters/audit/memory-adapter.js';

// Types
import { QueryPort } from './domain/ports/primary.js';
import {
  DataAccessPort,
  CryptographicPort,
  VocabularyPort,
  AuditPort,
} from './domain/ports/secondary.js';

export interface DataConfig {
  type: 'filesystem' | 'memory';
  vaultPath?: string;
  policiesPath?: string;
  config?: any; // Allow additional configuration
}

export interface CryptoConfig {
  type: 'software' | 'snarkjs';
  keyPairs?: Record<string, { publicKey: string; privateKey: string }>;
  config?: any; // Allow additional configuration for ZK circuits
}

export interface VocabularyConfig {
  type: 'http';
  allowedVocabularies?: string[];
  cacheTimeoutMs?: number;
  config?: any; // Allow additional configuration
}

export interface AuditConfig {
  type: 'console' | 'file' | 'memory';
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  maxEntries?: number;
  // File-specific options
  logDirectory?: string;
  maxFileSize?: number;
  maxFiles?: number;
  includeFullQuery?: boolean;
  includeFullResponse?: boolean;
  fileNamePattern?: string;
  // Memory-specific options
  autoCleanup?: boolean;
  config?: any; // Allow additional configuration
}

export interface TransportConfig {
  type: 'http' | 'memory';
  port?: number;
  corsOrigins?: string[];
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  config?: any; // Allow additional configuration
}

export interface VQPSystemConfig {
  data: DataConfig;
  crypto: CryptoConfig;
  vocabulary: VocabularyConfig;
  audit: AuditConfig;
  transport: TransportConfig;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  adapters: {
    data: string;
    crypto: string;
    vocabulary: string;
    audit: string;
    transport: string;
  };
}

/**
 * VQP System - Main system orchestrator using hexagonal architecture
 */
export class VQPSystem {
  private vqpService: VQPService;
  private dataAdapter: DataAccessPort;
  private cryptoAdapter: CryptographicPort;
  private vocabularyAdapter: VocabularyPort;
  private auditAdapter: AuditPort;
  private transportAdapter: QueryPort;
  private startTime: number = Date.now();

  constructor(config: VQPSystemConfig) {
    // Create adapters (dependency injection)
    this.dataAdapter = this.createDataAdapter(config.data);
    this.cryptoAdapter = this.createCryptoAdapter(config.crypto);
    this.vocabularyAdapter = this.createVocabularyAdapter(config.vocabulary);
    this.auditAdapter = this.createAuditAdapter(config.audit);

    // Assemble core service with adapters
    this.vqpService = new VQPService(
      this.dataAdapter,
      this.cryptoAdapter,
      this.vocabularyAdapter,
      this.auditAdapter
    );

    // Create transport adapter (primary adapter)
    this.transportAdapter = this.createTransportAdapter(config.transport);
  }

  /**
   * Initialize the VQP system (async operations)
   */
  async initialize(): Promise<void> {
    // Any async initialization can be done here
    // For now, just a simple ready message
    console.log('✅ VQP System initialized');
  }

  /**
   * Start the VQP system
   */
  async start(): Promise<void> {
    console.log('🚀 Starting VQP System...');

    // Start transport
    if (this.transportAdapter instanceof HTTPTransportAdapter) {
      await this.transportAdapter.start();
    }

    console.log('✅ VQP System started successfully');
  }

  /**
   * Stop the VQP system
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping VQP System...');

    if (this.transportAdapter instanceof HTTPTransportAdapter) {
      await this.transportAdapter.stop();
    }

    console.log('✅ VQP System stopped');
  }

  /**
   * Get the core VQP service
   */
  getService(): VQPService {
    return this.vqpService;
  }

  /**
   * Create a VQP verifier using the same crypto adapter
   */
  createVerifier(): VQPVerifier {
    return new VQPVerifier(this.cryptoAdapter);
  }

  /**
   * Convenience method: verify a VQP response
   */
  async verify(response: VQPResponse, originalQueryId?: string): Promise<boolean> {
    const verifier = this.createVerifier();
    return await verifier.verify(response);
  }

  /**
   * Get the transport adapter for direct access
   */
  getTransportAdapter(): QueryPort {
    return this.transportAdapter;
  }

  /**
   * Get the audit adapter for direct access
   */
  getAuditAdapter(): AuditPort {
    return this.auditAdapter;
  }

  /**
   * Get system health status
   */
  async getStatus(): Promise<SystemStatus> {
    return {
      status: 'healthy',
      uptime: Date.now() - this.startTime,
      adapters: {
        data: this.dataAdapter.constructor.name,
        crypto: this.cryptoAdapter.constructor.name,
        vocabulary: this.vocabularyAdapter.constructor.name,
        audit: this.auditAdapter.constructor.name,
        transport: this.transportAdapter.constructor.name,
      },
    };
  }

  /**
   * Create data adapter based on configuration
   */
  private createDataAdapter(config: DataConfig): DataAccessPort {
    switch (config.type) {
      case 'filesystem': {
        const fsConfig: FileSystemDataConfig = {
          vaultPath: config.vaultPath || './examples/sample-vault.json',
        };
        if (config.policiesPath) {
          fsConfig.policiesPath = config.policiesPath;
        }
        return new FileSystemDataAdapter(fsConfig);
      }
      default:
        throw new VQPError('CONFIGURATION_ERROR', `Unknown data adapter type: ${config.type}`);
    }
  }

  /**
   * Create crypto adapter based on configuration
   */
  private createCryptoAdapter(config: CryptoConfig): CryptographicPort {
    switch (config.type) {
      case 'software': {
        const cryptoConfig: SoftwareCryptoConfig = {};
        if (config.keyPairs) {
          cryptoConfig.keyPairs = config.keyPairs;
        }
        return new SoftwareCryptoAdapter(cryptoConfig);
      }
      case 'snarkjs': {
        const zkConfig: SnarkjsConfig = config.config || {};
        if (config.keyPairs) {
          zkConfig.keyPairs = config.keyPairs;
        }
        return new SnarkjsCryptoAdapter(zkConfig);
      }
      default:
        throw new VQPError('CONFIGURATION_ERROR', `Unknown crypto adapter type: ${config.type}`);
    }
  }

  /**
   * Create vocabulary adapter based on configuration
   */
  private createVocabularyAdapter(config: VocabularyConfig): VocabularyPort {
    switch (config.type) {
      case 'http': {
        const vocabConfig: HTTPVocabularyConfig = {};
        if (config.allowedVocabularies) {
          vocabConfig.allowedVocabularies = config.allowedVocabularies;
        }
        if (config.cacheTimeoutMs) {
          vocabConfig.cacheTimeoutMs = config.cacheTimeoutMs;
        }
        return new HTTPVocabularyAdapter(vocabConfig);
      }
      default:
        throw new VQPError(
          'CONFIGURATION_ERROR',
          `Unknown vocabulary adapter type: ${config.type}`
        );
    }
  }

  /**
   * Create audit adapter based on configuration
   */
  private createAuditAdapter(config: AuditConfig): AuditPort {
    switch (config.type) {
      case 'console': {
        const consoleConfig: ConsoleAuditConfig = {};
        if (config.logLevel) {
          consoleConfig.logLevel = config.logLevel;
        }
        if (config.maxEntries) {
          consoleConfig.maxEntries = config.maxEntries;
        }
        return new ConsoleAuditAdapter(consoleConfig);
      }

      case 'file': {
        const fileConfig: FileAuditConfig = {
          logDirectory: config.logDirectory || './logs/audit',
        };
        if (config.logLevel) {
          fileConfig.logLevel = config.logLevel;
        }
        if (config.maxFileSize) {
          fileConfig.maxFileSize = config.maxFileSize;
        }
        if (config.maxFiles) {
          fileConfig.maxFiles = config.maxFiles;
        }
        if (config.includeFullQuery !== undefined) {
          fileConfig.includeFullQuery = config.includeFullQuery;
        }
        if (config.includeFullResponse !== undefined) {
          fileConfig.includeFullResponse = config.includeFullResponse;
        }
        if (config.fileNamePattern) {
          fileConfig.fileNamePattern = config.fileNamePattern;
        }
        return new FileAuditAdapter(fileConfig);
      }

      case 'memory': {
        const memoryConfig: MemoryAuditConfig = {};
        if (config.logLevel) {
          memoryConfig.logLevel = config.logLevel;
        }
        if (config.maxEntries) {
          memoryConfig.maxEntries = config.maxEntries;
        }
        if (config.includeFullQuery !== undefined) {
          memoryConfig.includeFullQuery = config.includeFullQuery;
        }
        if (config.includeFullResponse !== undefined) {
          memoryConfig.includeFullResponse = config.includeFullResponse;
        }
        if (config.autoCleanup !== undefined) {
          memoryConfig.autoCleanup = config.autoCleanup;
        }
        return new MemoryAuditAdapter(memoryConfig);
      }

      default:
        throw new VQPError('CONFIGURATION_ERROR', `Unknown audit adapter type: ${config.type}`);
    }
  }

  /**
   * Create transport adapter based on configuration
   */
  private createTransportAdapter(config: TransportConfig): QueryPort {
    switch (config.type) {
      case 'http': {
        const transportConfig: {
          port?: number;
          corsOrigins?: string[];
          rateLimitWindowMs?: number;
          rateLimitMax?: number;
        } = {};

        if (config.port) {
          transportConfig.port = config.port;
        }
        if (config.corsOrigins) {
          transportConfig.corsOrigins = config.corsOrigins;
        }
        if (config.rateLimitWindowMs) {
          transportConfig.rateLimitWindowMs = config.rateLimitWindowMs;
        }
        if (config.rateLimitMax) {
          transportConfig.rateLimitMax = config.rateLimitMax;
        }

        return new HTTPTransportAdapter(this.vqpService, transportConfig);
      }
      case 'memory': {
        return new MemoryTransportAdapter(this.vqpService, config.config || {});
      }
      default:
        throw new VQPError('CONFIGURATION_ERROR', `Unknown transport adapter type: ${config.type}`);
    }
  }
}

/**
 * Factory function to create a VQP system with default configuration
 */
export function createVQPSystem(overrides: Partial<VQPSystemConfig> = {}): VQPSystem {
  const defaultConfig: VQPSystemConfig = {
    data: {
      type: 'filesystem',
      vaultPath: './examples/sample-vault.json',
      policiesPath: './examples/access-policies.json',
    },
    crypto: {
      type: 'software',
    },
    vocabulary: {
      type: 'http',
    },
    audit: {
      type: 'console',
      logLevel: 'info',
    },
    transport: {
      type: 'http',
      port: 8080,
    },
  };

  // Deep merge overrides
  const config = { ...defaultConfig, ...overrides };
  if (overrides.data) {
    config.data = { ...defaultConfig.data, ...overrides.data };
  }
  if (overrides.crypto) {
    config.crypto = { ...defaultConfig.crypto, ...overrides.crypto };
  }
  if (overrides.vocabulary) {
    config.vocabulary = { ...defaultConfig.vocabulary, ...overrides.vocabulary };
  }
  if (overrides.audit) {
    config.audit = { ...defaultConfig.audit, ...overrides.audit };
  }
  if (overrides.transport) {
    config.transport = { ...defaultConfig.transport, ...overrides.transport };
  }

  return new VQPSystem(config);
}
