# Schema.org Integration Guide

This guide explains how to use Schema.org vocabularies with the Verifiable Query Protocol (VQP), enabling privacy-preserving queries over structured data using the widely-adopted Schema.org semantic vocabulary.

## Overview

Schema.org is a collaborative effort by Google, Microsoft, Yahoo, and Yandex to create a common vocabulary for structured data on the web. VQP's Schema.org integration allows you to:

- **Query data using Schema.org types** like Person, Organization, Product, Event, and Place
- **Maintain privacy** while providing verifiable answers about structured data
- **Leverage existing Schema.org implementations** and tools
- **Enable semantic interoperability** across different systems

## Quick Start

### Installation

```bash
npm install @vqp/vocab-schemaorg @vqp/core
```

### Basic Usage

```typescript
import { VQPService, QueryBuilder } from '@vqp/core';
import { createSchemaOrgVocabularyAdapter } from '@vqp/vocab-schemaorg';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';

// Create VQP service with Schema.org support
const vqpService = new VQPService(
  await createFileSystemDataAdapter('./schema-org-vault.json'),
  await createSoftwareCryptoAdapter('./keys/'),
  createJSONLogicAdapter(),
  createSchemaOrgVocabularyAdapter(),
  createConsoleAuditAdapter()
);

// Query using Schema.org vocabulary
const query = new QueryBuilder()
  .requester('did:web:my-app.com')
  .vocabulary('schema.org:Person')
  .expression({
    "and": [
      { ">=": [{ "var": "age" }, 18] },
      { "!=": [{ "var": "name" }, ""] },
      { "==": [{ "var": "email_verified" }, true] }
    ]
  })
  .build();

const response = await vqpService.processQuery(query);
console.log('Person verified:', response.result);
```

## Supported Schema.org Types

The VQP Schema.org adapter supports the following primary types:

### Person
Personal identity and biographical information:
```typescript
// Available properties
{
  "name": "string",
  "givenName": "string", 
  "familyName": "string",
  "email": "string",
  "telephone": "string",
  "birthDate": "string",
  "age": "number",
  "gender": "string",
  "nationality": "string",
  "address": "object",
  "jobTitle": "string",
  "worksFor": "object",
  "alumniOf": "array",
  "knows": "array"
}
```

**Example Query:**
```json
{
  "vocab": "schema.org:Person",
  "expr": {
    "and": [
      { ">=": [{ "var": "age" }, 21] },
      { "!=": [{ "var": "jobTitle" }, ""] },
      { "!=": [{ "var": "worksFor.name" }, ""] }
    ]
  }
}
```

### Organization
Business and organizational information:
```typescript
// Available properties
{
  "name": "string",
  "legalName": "string",
  "email": "string",
  "telephone": "string",
  "url": "string",
  "address": "object",
  "foundingDate": "string",
  "numberOfEmployees": "number",
  "industry": "string",
  "taxID": "string",
  "duns": "string",
  "vatID": "string"
}
```

**Example Query:**
```json
{
  "vocab": "schema.org:Organization",
  "expr": {
    "and": [
      { ">": [{ "var": "numberOfEmployees" }, 50] },
      { "!=": [{ "var": "taxID" }, ""] },
      { "!=": [{ "var": "legalName" }, ""] }
    ]
  }
}
```

### Product
Product and inventory information:
```typescript
// Available properties
{
  "name": "string",
  "description": "string",
  "sku": "string",
  "gtin": "string",
  "brand": "string",
  "manufacturer": "string",
  "model": "string",
  "productID": "string",
  "category": "string",
  "color": "string",
  "weight": "number",
  "height": "number",
  "width": "number",
  "depth": "number"
}
```

**Example Query:**
```json
{
  "vocab": "https://schema.org/Product",
  "expr": {
    "and": [
      { "!=": [{ "var": "sku" }, ""] },
      { ">": [{ "var": "weight" }, 0] },
      { "!=": [{ "var": "manufacturer" }, null] }
    ]
  }
}
```

### Event
Event and activity information:
```typescript
// Available properties
{
  "name": "string",
  "description": "string",
  "startDate": "string",
  "endDate": "string",
  "location": "object",
  "organizer": "object",
  "attendee": "array",
  "eventStatus": "string"
}
```

**Example Query:**
```json
{
  "vocab": "schema.org:Event",
  "expr": {
    "and": [
      { ">=": [{ "var": "attendeeCount" }, 1] },
      { "==": [{ "var": "eventStatus" }, "EventScheduled"] },
      { "!=": [{ "var": "location" }, null] }
    ]
  }
}
```

### Place
Location and geographic information:
```typescript
// Available properties
{
  "name": "string",
  "address": "object",
  "geo": "object",
  "telephone": "string",
  "url": "string"
}
```

## Data Vault Structure

Create a JSON-LD formatted data vault with Schema.org types:

```json
{
  "@context": "https://schema.org",
  "person": {
    "@type": "Person",
    "name": "Alice Johnson",
    "givenName": "Alice",
    "familyName": "Johnson",
    "email": "alice@example.com",
    "age": 30,
    "jobTitle": "Software Engineer",
    "worksFor": {
      "@type": "Organization",
      "name": "Tech Corp",
      "numberOfEmployees": 500
    },
    "email_verified": true
  },
  "organization": {
    "@type": "Organization",
    "name": "Tech Corp",
    "legalName": "Technology Corporation Inc.",
    "numberOfEmployees": 500,
    "taxID": "12-3456789",
    "industry": "Technology"
  },
  "product": {
    "@type": "Product",
    "name": "Smart Widget",
    "sku": "SW-001",
    "weight": 0.5,
    "manufacturer": "Tech Corp"
  }
}
```

## Vocabulary URI Formats

VQP supports multiple Schema.org URI formats:

1. **Short form**: `schema.org:Type`
   ```json
   { "vocab": "schema.org:Person" }
   ```

2. **Full URI**: `https://schema.org/Type`
   ```json
   { "vocab": "https://schema.org/Product" }
   ```

## Custom Vocabulary Mapping

For complex data structures, you can customize how Schema.org properties map to your vault:

```typescript
import { SchemaOrgVocabularyMapping } from '@vqp/vocab-schemaorg';

class CustomSchemaOrgMapping extends SchemaOrgVocabularyMapping {
  toVaultPath(type: string, property: string): string[] {
    // Custom mapping logic
    if (type === 'Person' && property === 'worksFor.name') {
      return ['employee', 'company', 'name'];
    }
    return super.toVaultPath(type, property);
  }
}

const adapter = createSchemaOrgVocabularyAdapter({
  vocabularyMapping: new CustomSchemaOrgMapping()
});
```

## Integration Examples

### Identity Verification
```typescript
// Verify person is over 18 with valid email
const identityQuery = new QueryBuilder()
  .vocabulary('schema.org:Person')
  .expression({
    "and": [
      { ">=": [{ "var": "age" }, 18] },
      { "!=": [{ "var": "name" }, ""] },
      { "==": [{ "var": "email_verified" }, true] }
    ]
  })
  .build();
```

### Business Verification
```typescript
// Verify organization meets compliance requirements
const businessQuery = new QueryBuilder()
  .vocabulary('schema.org:Organization')
  .expression({
    "and": [
      { ">": [{ "var": "numberOfEmployees" }, 50] },
      { "!=": [{ "var": "taxID" }, ""] },
      { "!=": [{ "var": "legalName" }, ""] }
    ]
  })
  .build();
```

### Product Compliance
```typescript
// Verify product has required information
const productQuery = new QueryBuilder()
  .vocabulary('https://schema.org/Product')
  .expression({
    "and": [
      { "!=": [{ "var": "sku" }, ""] },
      { ">": [{ "var": "weight" }, 0] },
      { "!=": [{ "var": "manufacturer" }, null] }
    ]
  })
  .build();
```

### Complex Relationships
```typescript
// Query nested organization relationships
const employmentQuery = new QueryBuilder()
  .vocabulary('schema.org:Person')
  .expression({
    "and": [
      { ">=": [{ "var": "age" }, 25] },
      { "!=": [{ "var": "jobTitle" }, ""] },
      { "!=": [{ "var": "worksFor.name" }, ""] },
      { ">=": [{ "var": "worksFor.numberOfEmployees" }, 10] }
    ]
  })
  .build();
```

## Performance Considerations

- **Caching**: Schema.org vocabularies are automatically cached to improve performance
- **Lazy Loading**: Vocabularies are loaded only when needed
- **Memory Efficient**: JSON Schema conversion happens on-demand
- **Fast Validation**: Uses optimized JSON Schema validation

## Security Features

- **Input Validation**: All Schema.org queries are validated against proper schemas
- **Safe Evaluation**: Uses VQP's secure JSONLogic evaluation engine
- **Access Control**: Integrates with VQP's access control policies
- **Audit Logging**: All Schema.org queries are logged for compliance

## Error Handling

Common error scenarios and solutions:

```typescript
try {
  const response = await vqpService.processQuery(query);
} catch (error) {
  if (error.code === 'VOCABULARY_NOT_FOUND') {
    // Schema.org type not supported
    console.error('Unsupported Schema.org type:', error.details.vocab);
  } else if (error.code === 'INVALID_QUERY') {
    // Query doesn't match vocabulary schema
    console.error('Invalid query structure:', error.message);
  }
}
```

## Migration from VQP Vocabularies

Migrating from VQP standard vocabularies to Schema.org:

### Before (VQP Identity)
```json
{
  "vocab": "vqp:identity:v1",
  "expr": { ">=": [{ "var": "age" }, 18] }
}
```

### After (Schema.org Person)
```json
{
  "vocab": "schema.org:Person", 
  "expr": { ">=": [{ "var": "age" }, 18] }
}
```

## Best Practices

1. **Use Semantic Structure**: Organize your vault data using proper Schema.org JSON-LD structure
2. **Consistent Naming**: Use Schema.org property names consistently across your data
3. **Nested References**: Leverage Schema.org's relationship modeling for complex queries
4. **Type Safety**: Always validate your data against Schema.org schemas
5. **Performance**: Cache frequently used vocabularies for better performance

## Contributing

The Schema.org integration is actively maintained. To contribute:

1. **New Types**: Add support for additional Schema.org types
2. **Property Extensions**: Extend existing type definitions
3. **Performance**: Optimize vocabulary resolution and caching
4. **Documentation**: Improve examples and use cases

## Further Reading

- [Schema.org Documentation](https://schema.org/)
- [VQP Core Specification](./spec.md)
- [VQP Integration Guide](./integration-guide.md)
- [JSON-LD Specification](https://json-ld.org/)
- [VQP Examples Repository](../examples/)
