/**
 * File Audit Adapter - Implements AuditPort using file-based logging
 * This adapter logs audit events to files with rotation and filtering capabilities
 */

import { AuditPort } from '../../domain/ports/secondary.js';
import { VQPQuery, VQPResponse, VQPError, AuditEntry } from '../../domain/types.js';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface FileAuditConfig {
  logDirectory: string;
  maxFileSize?: number; // Max file size in bytes (default: 10MB)
  maxFiles?: number; // Max number of rotated files (default: 5)
  includeFullQuery?: boolean; // Include full query in logs
  includeFullResponse?: boolean; // Include full response in logs
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  fileNamePattern?: string; // Pattern for log file names (default: 'vqp-audit-{date}.log')
}

export class FileAuditAdapter implements AuditPort {
  private readonly logDirectory: string;
  private readonly maxFileSize: number;
  private readonly maxFiles: number;
  private readonly includeFullQuery: boolean;
  private readonly includeFullResponse: boolean;
  private readonly logLevel: string;
  private readonly fileNamePattern: string;

  constructor(config: FileAuditConfig) {
    if (!config.logDirectory) {
      throw new Error('logDirectory is required for FileAuditAdapter');
    }

    this.logDirectory = config.logDirectory;
    this.maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = config.maxFiles || 5;
    this.includeFullQuery = config.includeFullQuery || false;
    this.includeFullResponse = config.includeFullResponse || false;
    this.logLevel = config.logLevel || 'info';
    this.fileNamePattern = config.fileNamePattern || 'vqp-audit-{date}.log';
  }

  async logQuery(query: VQPQuery, response: VQPResponse): Promise<void> {
    const responseTime =
      new Date(response.timestamp).getTime() - new Date(query.timestamp).getTime();

    const entry: AuditEntry = {
      timestamp: response.timestamp, // Use response timestamp instead of current time
      event: 'query_processed',
      queryId: query.id,
      querier: query.requester,
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

    // Only include result if it's a boolean
    if (typeof response.result === 'boolean') {
      entry.result = response.result;
    }

    await this.writeLogEntry(entry, 'info');
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

    await this.writeLogEntry(entry, 'error');
  }

  async getAuditTrail(filters?: {
    startTime?: string;
    endTime?: string;
    querier?: string;
    event?: string;
  }): Promise<AuditEntry[]> {
    const logFiles = await this.getLogFiles();
    const entries: AuditEntry[] = [];

    for (const logFile of logFiles) {
      try {
        const content = await fs.readFile(logFile, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuditEntry;

            // Apply filters
            if (this.matchesFilters(entry, filters)) {
              entries.push(entry);
            }
          } catch (parseError) {
            // Skip malformed log lines
            continue;
          }
        }
      } catch (readError) {
        // Skip unreadable files
        continue;
      }
    }

    // Sort by timestamp (newest first)
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async purgeOldEntries(olderThan: string): Promise<number> {
    const cutoffDate = new Date(olderThan);
    const logFiles = await this.getLogFiles();
    let purgedCount = 0;

    for (const logFile of logFiles) {
      try {
        const content = await fs.readFile(logFile, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim());
        const remainingLines: string[] = [];

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuditEntry;
            const entryDate = new Date(entry.timestamp);

            if (entryDate >= cutoffDate) {
              remainingLines.push(line);
            } else {
              purgedCount++;
            }
          } catch (parseError) {
            // Keep malformed lines
            remainingLines.push(line);
          }
        }

        // Write back the remaining entries
        await fs.writeFile(
          logFile,
          remainingLines.join('\n') + (remainingLines.length > 0 ? '\n' : '')
        );
      } catch (error) {
        // Skip files that can't be processed
        continue;
      }
    }

    return purgedCount;
  }

  private async writeLogEntry(entry: AuditEntry, level: string): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    try {
      // Ensure log directory exists
      await this.ensureLogDirectory();

      const logFile = await this.getCurrentLogFile();
      const logLine = JSON.stringify(entry) + '\n';

      // Check if rotation is needed
      await this.rotateIfNeeded(logFile);

      // Append to log file
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write audit log:', error);
      console.log('Audit entry:', entry);
    }
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.access(this.logDirectory);
    } catch {
      await fs.mkdir(this.logDirectory, { recursive: true });
    }
  }

  private async getCurrentLogFile(): Promise<string> {
    const isoString = new Date().toISOString();
    const date = isoString.split('T')[0] || isoString.substring(0, 10); // YYYY-MM-DD
    const fileName = this.fileNamePattern.replace('{date}', date);
    return join(this.logDirectory, fileName);
  }

  private async rotateIfNeeded(logFile: string): Promise<void> {
    try {
      const stats = await fs.stat(logFile);
      if (stats.size >= this.maxFileSize) {
        await this.rotateLogFiles(logFile);
      }
    } catch {
      // File doesn't exist yet, no rotation needed
    }
  }

  private async rotateLogFiles(currentFile: string): Promise<void> {
    const baseFile = currentFile.replace(/\.log$/, '');

    // Remove oldest file if we're at the limit
    const oldestFile = `${baseFile}.${this.maxFiles}.log`;
    try {
      await fs.unlink(oldestFile);
    } catch {
      // File doesn't exist, which is fine
    }

    // Rotate existing files
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldFile = `${baseFile}.${i}.log`;
      const newFile = `${baseFile}.${i + 1}.log`;

      try {
        await fs.rename(oldFile, newFile);
      } catch {
        // File doesn't exist, continue
      }
    }

    // Move current file to .1
    try {
      await fs.rename(currentFile, `${baseFile}.1.log`);
    } catch {
      // Current file doesn't exist, which is fine
    }
  }

  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logDirectory);
      const logFiles = files
        .filter((file) => file.includes('vqp-audit') && file.endsWith('.log'))
        .map((file) => join(this.logDirectory, file))
        .sort(); // Sort to ensure consistent order

      return logFiles;
    } catch {
      return [];
    }
  }

  private matchesFilters(
    entry: AuditEntry,
    filters?: {
      startTime?: string;
      endTime?: string;
      querier?: string;
      event?: string;
    }
  ): boolean {
    if (!filters) {
      return true;
    }

    // Time range filter
    if (filters.startTime) {
      const entryTime = new Date(entry.timestamp);
      const startTime = new Date(filters.startTime);
      if (entryTime < startTime) {
        return false;
      }
    }

    if (filters.endTime) {
      const entryTime = new Date(entry.timestamp);
      const endTime = new Date(filters.endTime);
      if (entryTime > endTime) {
        return false;
      }
    }

    // Querier filter
    if (filters.querier && entry.querier !== filters.querier) {
      return false;
    }

    // Event type filter
    if (filters.event && entry.event !== filters.event) {
      return false;
    }

    return true;
  }

  private shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel as keyof typeof levels] || 1;
    const messageLevel = levels[level as keyof typeof levels] || 1;

    return messageLevel >= currentLevel;
  }

  private sanitizeContext(context: any): any {
    if (!context) {
      return context;
    }

    // Remove sensitive information from context
    const sanitized = { ...context };

    // Remove common sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate large objects
    const maxSize = 1000;
    const contextStr = JSON.stringify(sanitized);
    if (contextStr.length > maxSize) {
      return {
        ...sanitized,
        _truncated: true,
        _originalSize: contextStr.length,
      };
    }

    return sanitized;
  }
}
