# @vqp/data-filesystem

File System Data Adapter for VQP - implements DataAccessPort using local file storage.

## Overview

This adapter allows VQP to read data from encrypted JSON files stored on the local file system. It supports access policies, data validation, and secure file operations.

## Installation

```bash
npm install @vqp/data-filesystem @vqp/core
```

## Usage

```typescript
import { VQPService } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';

// Create the adapter
const dataAdapter = await createFileSystemDataAdapter({
  vaultPath: './vault.json',
  policiesPath: './policies.json'  // Optional
});

// Use with VQP service
const vqpService = new VQPService(
  dataAdapter,
  cryptoAdapter,
  evalAdapter,
  auditAdapter
);
```

## Configuration

### FileSystemDataConfig

```typescript
interface FileSystemDataConfig {
  vaultPath: string;           // Path to vault JSON file
  policiesPath?: string;       // Path to access policies (optional)
  encryptionEnabled?: boolean; // Enable file encryption (default: false)
  backupEnabled?: boolean;     // Enable automatic backups (default: true)
  cacheEnabled?: boolean;      // Enable in-memory caching (default: true)
}
```

## Vault File Format

```json
{
  "personal": {
    "age": 28,
    "citizenship": "US",
    "has_drivers_license": true
  },
  "financial": {
    "annual_income": 75000,
    "employment_status": "employed"
  },
  "system": {
    "uptime_percentage_24h": 99.8,
    "processed_events_last_hour": 1250
  }
}
```

## Access Policies

```json
{
  "policies": [
    {
      "resource": "personal.age",
      "allowed_queriers": ["did:web:trusted-service.com"],
      "rate_limit": "10/hour",
      "require_justification": true
    },
    {
      "resource": "financial.*",
      "allowed_queriers": ["did:web:bank.com"],
      "rate_limit": "5/day"
    }
  ]
}
```

## Features

- **Nested Data Access**: Query nested JSON structures using dot notation
- **Access Control**: Policy-based access control for data fields
- **Rate Limiting**: Built-in rate limiting per querier
- **Caching**: In-memory caching for performance
- **Backup Support**: Automatic backup creation
- **Validation**: Data validation against schemas

## API Reference

### createFileSystemDataAdapter

Factory function to create a filesystem data adapter.

```typescript
async function createFileSystemDataAdapter(
  config: FileSystemDataConfig
): Promise<FileSystemDataAdapter>
```

### FileSystemDataAdapter

Implements the DataAccessPort interface.

```typescript
class FileSystemDataAdapter implements DataAccessPort {
  async getData(path: string[]): Promise<any>
  async validateDataAccess(path: string[], requester: string): Promise<boolean>
  async updateVault(data: any): Promise<void>
  async createBackup(): Promise<string>
  async getAccessLog(): Promise<AccessLogEntry[]>
}
```

## Examples

### Basic Usage

```typescript
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';

const adapter = await createFileSystemDataAdapter({
  vaultPath: './data/vault.json'
});

// Get data
const age = await adapter.getData(['personal', 'age']);
console.log('Age:', age);

// Validate access
const canAccess = await adapter.validateDataAccess(
  ['financial', 'income'], 
  'did:web:bank.com'
);
```

### With Encryption

```typescript
const adapter = await createFileSystemDataAdapter({
  vaultPath: './data/encrypted-vault.json',
  encryptionEnabled: true,
  encryptionKey: process.env.VAULT_ENCRYPTION_KEY
});
```

### With Access Policies

```typescript
const adapter = await createFileSystemDataAdapter({
  vaultPath: './vault.json',
  policiesPath: './access-policies.json'
});
```

## Error Handling

The adapter throws specific errors for different scenarios:

```typescript
try {
  const data = await adapter.getData(['nonexistent', 'path']);
} catch (error) {
  if (error.code === 'DATA_NOT_FOUND') {
    console.log('Data path does not exist');
  } else if (error.code === 'ACCESS_DENIED') {
    console.log('Access denied by policy');
  }
}
```

## Performance

- **Caching**: Frequently accessed data is cached in memory
- **Lazy Loading**: Data is loaded only when requested
- **Streaming**: Large files are streamed for memory efficiency
- **Compression**: Optional gzip compression for storage

## Security

- **File Permissions**: Respects file system permissions
- **Path Validation**: Prevents directory traversal attacks
- **Access Logging**: All access attempts are logged
- **Encryption**: Optional AES-256-GCM encryption

## License

MIT
