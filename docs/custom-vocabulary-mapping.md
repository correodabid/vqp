# Custom Vocabulary Mapping Guide

This guide explains how to create and use custom vocabulary mappings in VQP to support non-standard data structures and custom vocabularies.

## Overview

By default, VQP uses a `StandardVocabularyMapping` that maps standard vocabularies (like `vqp:identity:v1`) to predefined vault structures. However, real-world systems often have custom data layouts that don't match these standards.

Custom vocabulary mappings allow you to:
- Support existing data structures without reorganizing your data
- Use custom vocabularies with domain-specific field names
- Implement complex data organization patterns (multi-tenant, hierarchical, etc.)
- Maintain backwards compatibility while extending VQP functionality

## The VocabularyMapping Interface

```typescript
interface VocabularyMapping {
  /**
   * Map vocabulary field to vault path
   * @param field The field name from the vocabulary
   * @param vocabularyUri The vocabulary URI for context
   * @returns Array representing the path in the vault
   */
  toVaultPath(field: string, vocabularyUri?: string): string[];
  
  /**
   * Map vault path back to vocabulary field
   * @param path The path in the vault
   * @param vocabularyUri The vocabulary URI for context
   * @returns The field name as it should appear in the vocabulary
   */
  toVocabularyField(path: string[], vocabularyUri?: string): string;
}
```

## Built-in Mappings

### StandardVocabularyMapping (Default)

Maps standard VQP vocabularies to structured categories:

```typescript
// vqp:identity:v1 fields → personal/*
// vqp:financial:v1 fields → financial/*
// vqp:health:v1 fields → health/*
// etc.

const mapping = new StandardVocabularyMapping();
mapping.toVaultPath('age', 'vqp:identity:v1'); // ['personal', 'age']
mapping.toVaultPath('annual_income', 'vqp:financial:v1'); // ['financial', 'annual_income']
```

### FlatVocabularyMapping

For flat data structures where all fields are at the top level:

```typescript
const mapping = new FlatVocabularyMapping();
mapping.toVaultPath('age'); // ['age']
mapping.toVaultPath('user.profile.name'); // ['user', 'profile', 'name']
```

## Creating Custom Mappings

### Example 1: Employee Management System

For a system with employee records organized by ID:

```json
{
  "employees": {
    "emp-123": {
      "profile": {
        "name": "John Doe",
        "department": "Engineering",
        "level": "senior"
      },
      "permissions": {
        "admin": true,
        "database_access": true
      },
      "years_experience": 8
    }
  }
}
```

Custom mapping implementation:

```typescript
class EmployeeVocabularyMapping implements VocabularyMapping {
  constructor(private employeeId: string) {}

  toVaultPath(field: string, vocabularyUri?: string): string[] {
    if (vocabularyUri === 'company:employee:v1') {
      // Handle profile fields: profile.name → ['employees', 'emp-123', 'profile', 'name']
      if (field.startsWith('profile.')) {
        const profileField = field.substring(8);
        return ['employees', this.employeeId, 'profile', profileField];
      }
      
      // Handle permission fields: permissions.admin → ['employees', 'emp-123', 'permissions', 'admin']
      if (field.startsWith('permissions.')) {
        const permField = field.substring(12);
        return ['employees', this.employeeId, 'permissions', permField];
      }
      
      // Direct employee fields: years_experience → ['employees', 'emp-123', 'years_experience']
      return ['employees', this.employeeId, field];
    }
    
    // Default behavior for other vocabularies
    return field.includes('.') ? field.split('.') : [field];
  }

  toVocabularyField(path: string[], vocabularyUri?: string): string {
    if (vocabularyUri === 'company:employee:v1' && path.length >= 3) {
      if (path[0] === 'employees' && path[1] === this.employeeId) {
        if (path[2] === 'profile' && path.length >= 4) {
          return `profile.${path.slice(3).join('.')}`;
        }
        if (path[2] === 'permissions' && path.length >= 4) {
          return `permissions.${path.slice(3).join('.')}`;
        }
        return path.slice(2).join('.');
      }
    }
    
    return path.join('.');
  }
}
```

### Example 2: Multi-Tenant System

For systems with tenant-specific data organization:

```typescript
class TenantVocabularyMapping implements VocabularyMapping {
  constructor(private tenantId: string) {}

  toVaultPath(field: string, vocabularyUri?: string): string[] {
    // All data is organized under tenant ID
    const basePath = ['tenants', this.tenantId];
    
    if (vocabularyUri?.startsWith('tenant:')) {
      const domain = vocabularyUri.split(':')[1]; // e.g., 'users', 'products'
      return [...basePath, domain, field];
    }
    
    return [...basePath, 'general', field];
  }

  toVocabularyField(path: string[]): string {
    // Extract field from tenant path structure
    if (path.length >= 4 && path[0] === 'tenants') {
      return path.slice(3).join('.');
    }
    return path.join('.');
  }
}
```

## Using Custom Mappings

### Configure VQPService

```typescript
import { VQPService } from '@vqp/core';

// Create your custom mapping
const employeeMapping = new EmployeeVocabularyMapping('emp-123');

// Configure VQP service with custom mapping
const vqpService = new VQPService(
  dataAdapter,
  cryptoAdapter,
  auditAdapter,
  evaluationAdapter,
  vocabularyAdapter, // optional
  {
    vocabularyMapping: employeeMapping,
    allowedVocabularies: ['company:employee:v1']
  }
);
```

### Define Custom Vocabulary

```typescript
const employeeVocabulary = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Company Employee Vocabulary v1",
  type: "object",
  properties: {
    "profile.name": { type: "string" },
    "profile.department": { type: "string" },
    "profile.level": { 
      type: "string", 
      enum: ["junior", "mid", "senior", "principal"] 
    },
    "permissions.admin": { type: "boolean" },
    "permissions.database_access": { type: "boolean" },
    "years_experience": { type: "integer", minimum: 0 }
  }
};
```

### Query with Custom Vocabulary

```typescript
import { QueryBuilder } from '@vqp/core';

const query = new QueryBuilder()
  .requester('did:web:hr-system.company.com')
  .vocabulary('company:employee:v1')
  .expression({
    "and": [
      { "==": [{ "var": "profile.level" }, "senior"] },
      { "==": [{ "var": "permissions.admin" }, true] },
      { ">=": [{ "var": "years_experience" }, 5] }
    ]
  })
  .build();

// Process query with custom vocabulary
const response = await vqpService.processQuery(query, employeeVocabulary);
```

## Advanced Patterns

### Context-Aware Mapping

For mappings that depend on query context or runtime information:

```typescript
class ContextAwareMapping implements VocabularyMapping {
  constructor(private getContext: () => { userId: string; role: string }) {}

  toVaultPath(field: string, vocabularyUri?: string): string[] {
    const context = this.getContext();
    
    // Different mappings based on user role
    if (context.role === 'admin') {
      return ['admin_data', field];
    } else {
      return ['user_data', context.userId, field];
    }
  }

  toVocabularyField(path: string[]): string {
    // Reverse mapping logic
    return path[path.length - 1] || '';
  }
}
```

### Conditional Mapping

For vocabularies that map differently based on field types:

```typescript
class ConditionalMapping implements VocabularyMapping {
  toVaultPath(field: string, vocabularyUri?: string): string[] {
    // Map sensitive fields to encrypted storage
    const sensitiveFields = ['ssn', 'credit_card', 'password'];
    if (sensitiveFields.some(sf => field.includes(sf))) {
      return ['encrypted', field];
    }
    
    // Map audit fields to separate storage
    if (field.startsWith('audit_')) {
      return ['audit', field.substring(6)];
    }
    
    // Regular fields to standard location
    return ['data', field];
  }

  toVocabularyField(path: string[]): string {
    if (path[0] === 'encrypted') {
      return path[1];
    }
    if (path[0] === 'audit') {
      return `audit_${path[1]}`;
    }
    return path[1] || '';
  }
}
```

## Testing Custom Mappings

Always test your custom mappings thoroughly:

```typescript
import { test } from 'node:test';
import assert from 'node:assert';

test('EmployeeMapping should handle nested fields correctly', () => {
  const mapping = new EmployeeVocabularyMapping('emp-123');
  
  // Test forward mapping
  assert.deepStrictEqual(
    mapping.toVaultPath('profile.name', 'company:employee:v1'),
    ['employees', 'emp-123', 'profile', 'name']
  );
  
  // Test reverse mapping
  assert.strictEqual(
    mapping.toVocabularyField(
      ['employees', 'emp-123', 'profile', 'name'], 
      'company:employee:v1'
    ),
    'profile.name'
  );
});
```

## Best Practices

1. **Consistency**: Ensure forward and reverse mappings are consistent
2. **Error Handling**: Handle edge cases gracefully (missing fields, invalid paths)
3. **Performance**: Keep mappings simple and efficient for high-volume queries
4. **Documentation**: Document your mapping logic clearly for maintenance
5. **Testing**: Write comprehensive tests for all mapping scenarios
6. **Backwards Compatibility**: Consider migration paths when changing mappings

## Migration from Standard Mappings

If you're migrating from standard VQP vocabularies to custom ones:

1. **Create wrapper mapping** that supports both old and new formats
2. **Gradual migration** by supporting multiple vocabulary URIs
3. **Data transformation** scripts to reorganize existing data if needed
4. **Comprehensive testing** to ensure no data access is broken

This custom vocabulary mapping system makes VQP extremely flexible and allows it to work with any existing data structure while maintaining the protocol's privacy and verifiability guarantees.
